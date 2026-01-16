//! NIV Engine API Server
//!
//! Endpoints:
//! - GET /api/v1/latest - Current NIV score and recession probability
//! - GET /api/v1/history - Historical NIV data (1960-present)
//! - GET /api/v1/components - Current component breakdown
//! - GET /api/v1/compare - NIV vs Fed Yield Curve comparison
//! - POST /api/v1/simulate - Run simulation with custom parameters
//! - POST /api/v1/monte-carlo - Run Monte Carlo analysis
//! - POST /api/v1/sensitivity - Run sensitivity analysis
//! - GET /health - Health check

mod niv;
mod fred;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use chrono::{NaiveDate, Datelike};
use moka::future::Cache;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::niv::{AlertLevel, NIVComponents, NIVEngine, NIVResult};
use crate::fred::mock;

/// Application state
struct AppState {
    engine: NIVEngine,
    cache: Cache<String, CachedData>,
    data: RwLock<Vec<NIVResult>>,
}

/// Cached computation results
#[derive(Clone)]
struct CachedData {
    results: Vec<NIVResult>,
    computed_at: chrono::DateTime<chrono::Utc>,
}

/// Query parameters for history endpoint
#[derive(Debug, Deserialize)]
struct HistoryQuery {
    start: Option<String>,  // YYYY-MM-DD
    end: Option<String>,    // YYYY-MM-DD
    #[serde(default = "default_limit")]
    limit: usize,
}

fn default_limit() -> usize {
    1000
}

/// Simulation request parameters
#[derive(Debug, Deserialize)]
struct SimulateRequest {
    eta: Option<f64>,
    weights: Option<ComponentWeightsRequest>,
    smooth_window: Option<usize>,
    start: Option<String>,  // YYYY-MM-DD
    end: Option<String>,    // YYYY-MM-DD
    fred_api_key: Option<String>,  // Optional FRED API key for live data
    use_live_data: Option<bool>,   // Whether to use live FRED data
}

#[derive(Debug, Deserialize)]
struct ComponentWeightsRequest {
    thrust: Option<f64>,
    efficiency: Option<f64>,
    slack: Option<f64>,
    drag: Option<f64>,
}

/// Monte Carlo request parameters
#[derive(Debug, Deserialize)]
struct MonteCarloRequest {
    num_draws: Option<usize>,
    window_size: Option<usize>,
    confidence_level: Option<f64>,
    eta: Option<f64>,
}

/// Sensitivity analysis request
#[derive(Debug, Deserialize)]
struct SensitivityRequest {
    component: String,  // "eta", "thrust", "efficiency", "slack", "drag"
    min_value: Option<f64>,
    max_value: Option<f64>,
    steps: Option<usize>,
}

/// API Response types
#[derive(Serialize)]
struct LatestResponse {
    date: String,
    niv_score: f64,
    recession_probability: f64,
    alert_level: AlertLevel,
    alert_color: String,
    alert_label: String,
    components: ComponentsResponse,
    vs_fed: FedComparisonResponse,
}

#[derive(Serialize)]
struct ComponentsResponse {
    thrust: f64,
    efficiency: f64,
    slack: f64,
    drag: f64,
    interpretation: ComponentInterpretation,
}

#[derive(Serialize)]
struct ComponentInterpretation {
    thrust_status: String,
    efficiency_status: String,
    slack_status: String,
    drag_status: String,
}

#[derive(Serialize)]
struct FedComparisonResponse {
    niv_signal: String,
    yield_curve_signal: String,
    agreement: bool,
    niv_lead_months: i32,
}

#[derive(Serialize)]
struct HistoryResponse {
    count: usize,
    start_date: String,
    end_date: String,
    data: Vec<HistoryDataPoint>,
}

#[derive(Serialize)]
struct HistoryDataPoint {
    date: String,
    niv_score: f64,
    recession_probability: f64,
    alert_level: AlertLevel,
    is_recession: bool,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    version: String,
    data_points: usize,
    last_update: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    code: String,
}

/// Simulation response
#[derive(Serialize)]
struct SimulateResponse {
    params: SimulationParamsResponse,
    data: Vec<HistoryDataPoint>,
    summary: SimulationSummary,
}

#[derive(Serialize)]
struct SimulationParamsResponse {
    eta: f64,
    weights: ComponentWeightsResponse,
    smooth_window: usize,
    start_date: String,
    end_date: String,
}

#[derive(Serialize)]
struct ComponentWeightsResponse {
    thrust: f64,
    efficiency: f64,
    slack: f64,
    drag: f64,
}

#[derive(Serialize)]
struct SimulationSummary {
    total_points: usize,
    avg_probability: f64,
    max_probability: f64,
    min_probability: f64,
    recessions_detected: usize,
    false_positives: usize,
    true_positives: usize,
}

/// Monte Carlo response
#[derive(Serialize)]
struct MonteCarloResponse {
    num_draws: usize,
    window_size: usize,
    current_probability: f64,
    distribution: MonteCarloDistribution,
    percentiles: MonteCarloPercentiles,
}

#[derive(Serialize)]
struct MonteCarloDistribution {
    buckets: Vec<MonteCarloBucket>,
    mean: f64,
    std_dev: f64,
}

#[derive(Serialize)]
struct MonteCarloBucket {
    range_start: f64,
    range_end: f64,
    count: usize,
    frequency: f64,
}

#[derive(Serialize)]
struct MonteCarloPercentiles {
    p5: f64,
    p10: f64,
    p25: f64,
    p50: f64,
    p75: f64,
    p90: f64,
    p95: f64,
}

/// Sensitivity response
#[derive(Serialize)]
struct SensitivityResponse {
    component: String,
    baseline_value: f64,
    baseline_probability: f64,
    sensitivity_data: Vec<SensitivityPoint>,
}

#[derive(Serialize)]
struct SensitivityPoint {
    value: f64,
    probability: f64,
    delta_from_baseline: f64,
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .init();
    
    tracing::info!("Starting NIV Engine API Server");
    
    // Initialize engine and compute initial data
    let engine = NIVEngine::new();
    let mock_data = mock::generate_mock_data(1960, 2026);
    let initial_results = engine.calculate_series(&mock_data);
    
    tracing::info!("Computed {} NIV data points", initial_results.len());
    
    // Create cache with 1 hour TTL
    let cache: Cache<String, CachedData> = Cache::builder()
        .time_to_live(Duration::from_secs(3600))
        .build();
    
    // Store initial data in cache
    cache.insert("niv_data".to_string(), CachedData {
        results: initial_results.clone(),
        computed_at: chrono::Utc::now(),
    }).await;
    
    let state = Arc::new(AppState {
        engine,
        cache,
        data: RwLock::new(initial_results),
    });
    
    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    
    // Build router
    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/api/v1/latest", get(get_latest))
        .route("/api/v1/history", get(get_history))
        .route("/api/v1/components", get(get_components))
        .route("/api/v1/compare", get(get_comparison))
        .route("/api/v1/recessions", get(get_recessions))
        // New simulation endpoints
        .route("/api/v1/simulate", post(run_simulation))
        .route("/api/v1/monte-carlo", post(run_monte_carlo))
        .route("/api/v1/sensitivity", post(run_sensitivity))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);
    
    // Get port from environment or default
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .unwrap_or(8080);
    
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Listening on http://{}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Root endpoint
async fn root() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "name": "NIV Engine API",
        "version": "1.0.0",
        "description": "National Impact Velocity - Macro Crisis Detection",
        "endpoints": {
            "latest": "/api/v1/latest",
            "history": "/api/v1/history",
            "components": "/api/v1/components",
            "compare": "/api/v1/compare",
            "recessions": "/api/v1/recessions",
            "health": "/health"
        },
        "documentation": "https://regenerationism.ai/docs"
    }))
}

/// Health check endpoint
async fn health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    let data = state.data.read().await;
    let last_date = data.last()
        .map(|d| d.date.to_string())
        .unwrap_or_else(|| "N/A".to_string());
    
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: "1.0.0".to_string(),
        data_points: data.len(),
        last_update: last_date,
    })
}

/// Get latest NIV score
async fn get_latest(State(state): State<Arc<AppState>>) -> Result<Json<LatestResponse>, StatusCode> {
    let data = state.data.read().await;
    
    let latest = data.last()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Interpret components
    let interpretation = ComponentInterpretation {
        thrust_status: interpret_thrust(latest.components.thrust),
        efficiency_status: interpret_efficiency(latest.components.efficiency),
        slack_status: interpret_slack(latest.components.slack),
        drag_status: interpret_drag(latest.components.drag),
    };
    
    // Compare with Fed yield curve signal
    let niv_signal = if latest.recession_probability > 0.5 { "RECESSION RISK" } else { "EXPANSION" };
    let yield_curve_signal = if latest.components.drag > 0.03 { "INVERTED" } else { "NORMAL" };
    
    Ok(Json(LatestResponse {
        date: latest.date.to_string(),
        niv_score: round2(latest.niv_score),
        recession_probability: round2(latest.recession_probability * 100.0),
        alert_level: latest.alert_level,
        alert_color: latest.alert_level.color().to_string(),
        alert_label: latest.alert_level.label().to_string(),
        components: ComponentsResponse {
            thrust: round3(latest.components.thrust),
            efficiency: round3(latest.components.efficiency),
            slack: round3(latest.components.slack),
            drag: round3(latest.components.drag),
            interpretation,
        },
        vs_fed: FedComparisonResponse {
            niv_signal: niv_signal.to_string(),
            yield_curve_signal: yield_curve_signal.to_string(),
            agreement: (latest.recession_probability > 0.5) == (latest.components.drag > 0.03),
            niv_lead_months: 6, // NIV typically leads by 6 months
        },
    }))
}

/// Get historical NIV data
async fn get_history(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HistoryQuery>,
) -> Result<Json<HistoryResponse>, StatusCode> {
    let data = state.data.read().await;
    
    // Parse date filters
    let start_date = params.start
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());
    let end_date = params.end
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());
    
    // Filter data
    let filtered: Vec<_> = data.iter()
        .filter(|d| {
            let after_start = start_date.map(|s| d.date >= s).unwrap_or(true);
            let before_end = end_date.map(|e| d.date <= e).unwrap_or(true);
            after_start && before_end
        })
        .take(params.limit)
        .map(|d| HistoryDataPoint {
            date: d.date.to_string(),
            niv_score: round2(d.niv_score),
            recession_probability: round2(d.recession_probability * 100.0),
            alert_level: d.alert_level,
            is_recession: niv::RecessionPeriods::is_recession(d.date),
        })
        .collect();
    
    let start = filtered.first().map(|d| d.date.clone()).unwrap_or_default();
    let end = filtered.last().map(|d| d.date.clone()).unwrap_or_default();
    
    Ok(Json(HistoryResponse {
        count: filtered.len(),
        start_date: start,
        end_date: end,
        data: filtered,
    }))
}

/// Get current component breakdown
async fn get_components(State(state): State<Arc<AppState>>) -> Result<Json<ComponentsResponse>, StatusCode> {
    let data = state.data.read().await;
    
    let latest = data.last()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let interpretation = ComponentInterpretation {
        thrust_status: interpret_thrust(latest.components.thrust),
        efficiency_status: interpret_efficiency(latest.components.efficiency),
        slack_status: interpret_slack(latest.components.slack),
        drag_status: interpret_drag(latest.components.drag),
    };
    
    Ok(Json(ComponentsResponse {
        thrust: round3(latest.components.thrust),
        efficiency: round3(latest.components.efficiency),
        slack: round3(latest.components.slack),
        drag: round3(latest.components.drag),
        interpretation,
    }))
}

/// Get NIV vs Fed comparison data
async fn get_comparison(State(state): State<Arc<AppState>>) -> Result<Json<Vec<ComparisonPoint>>, StatusCode> {
    let data = state.data.read().await;
    
    // Get last 120 months (10 years)
    let recent: Vec<ComparisonPoint> = data.iter()
        .rev()
        .take(120)
        .rev()
        .map(|d| {
            // Simulate Fed yield curve recession probability
            // In reality, you'd pull this from another source
            let fed_prob = if d.components.drag > 0.03 {
                0.6 + d.components.drag * 2.0
            } else {
                0.2 + d.components.drag
            }.clamp(0.0, 1.0);
            
            ComparisonPoint {
                date: d.date.to_string(),
                niv_probability: round2(d.recession_probability * 100.0),
                fed_probability: round2(fed_prob * 100.0),
                is_recession: niv::RecessionPeriods::is_recession(d.date),
            }
        })
        .collect();
    
    Ok(Json(recent))
}

#[derive(Serialize)]
struct ComparisonPoint {
    date: String,
    niv_probability: f64,
    fed_probability: f64,
    is_recession: bool,
}

/// Get recession periods
async fn get_recessions() -> Json<Vec<RecessionPeriod>> {
    let periods: Vec<RecessionPeriod> = niv::RecessionPeriods::known_recessions()
        .iter()
        .map(|(start, end)| RecessionPeriod {
            start: start.to_string(),
            end: end.to_string(),
            name: recession_name(*start),
        })
        .collect();
    
    Json(periods)
}

#[derive(Serialize)]
struct RecessionPeriod {
    start: String,
    end: String,
    name: String,
}

fn recession_name(start: NaiveDate) -> String {
    match start.year() {
        2020 => "COVID-19 Recession".to_string(),
        2007 | 2008 => "Great Recession".to_string(),
        2001 => "Dot-com Recession".to_string(),
        1990 => "Early 1990s Recession".to_string(),
        1981 | 1982 => "Early 1980s Recession".to_string(),
        1980 => "1980 Recession".to_string(),
        1973 | 1974 | 1975 => "1973-75 Recession".to_string(),
        1969 | 1970 => "1969-70 Recession".to_string(),
        _ => format!("{} Recession", start.year()),
    }
}

// Helper functions
fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

fn round3(v: f64) -> f64 {
    (v * 1000.0).round() / 1000.0
}

fn interpret_thrust(v: f64) -> String {
    match v {
        v if v > 0.5 => "Strong expansion impulse".to_string(),
        v if v > 0.2 => "Moderate growth impulse".to_string(),
        v if v > -0.2 => "Neutral".to_string(),
        v if v > -0.5 => "Moderate contraction pressure".to_string(),
        _ => "Strong contraction pressure".to_string(),
    }
}

fn interpret_efficiency(v: f64) -> String {
    match v {
        v if v > 0.02 => "High productive investment".to_string(),
        v if v > 0.01 => "Healthy investment levels".to_string(),
        v if v > 0.005 => "Below-average investment".to_string(),
        _ => "Weak investment - hollow growth risk".to_string(),
    }
}

fn interpret_slack(v: f64) -> String {
    match v {
        v if v > 0.25 => "High unused capacity - recession signal".to_string(),
        v if v > 0.15 => "Elevated slack".to_string(),
        v if v > 0.08 => "Normal capacity utilization".to_string(),
        _ => "Economy running hot".to_string(),
    }
}

fn interpret_drag(v: f64) -> String {
    match v {
        v if v > 0.05 => "CRITICAL: High friction - liquidity stress".to_string(),
        v if v > 0.03 => "Elevated drag - watch closely".to_string(),
        v if v > 0.01 => "Normal friction levels".to_string(),
        _ => "Low friction - smooth capital flow".to_string(),
    }
}

// ============================================================================
// SIMULATION ENDPOINTS
// ============================================================================

/// Run simulation with custom parameters
async fn run_simulation(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SimulateRequest>,
) -> Result<Json<SimulateResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Parse parameters with defaults
    let eta = req.eta.unwrap_or(niv::ETA);
    let weights = ComponentWeightsResponse {
        thrust: req.weights.as_ref().and_then(|w| w.thrust).unwrap_or(1.0),
        efficiency: req.weights.as_ref().and_then(|w| w.efficiency).unwrap_or(1.0),
        slack: req.weights.as_ref().and_then(|w| w.slack).unwrap_or(1.0),
        drag: req.weights.as_ref().and_then(|w| w.drag).unwrap_or(1.0),
    };
    let smooth_window = req.smooth_window.unwrap_or(niv::SMOOTH_WINDOW);

    // Parse date range
    let start_date = req.start
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
        .unwrap_or_else(|| NaiveDate::from_ymd_opt(2000, 1, 1).unwrap());
    let end_date = req.end
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
        .unwrap_or_else(|| chrono::Utc::now().date_naive());

    // Create engine with custom eta
    let engine = niv::NIVEngine::with_eta(eta);

    // Determine data source: live FRED or mock
    let use_live = req.use_live_data.unwrap_or(false);
    let economic_data = if use_live {
        if let Some(api_key) = &req.fred_api_key {
            // Try to fetch live FRED data
            let client = fred::FredClient::with_api_key(api_key.clone());
            match client.fetch_all(Some(start_date), Some(end_date)).await {
                Ok(data) => {
                    tracing::info!("Fetched {} live data points from FRED", data.len());
                    data
                }
                Err(e) => {
                    tracing::warn!("FRED fetch failed: {}, falling back to mock data", e);
                    mock::generate_mock_data(start_date.year(), end_date.year())
                }
            }
        } else {
            tracing::warn!("Live data requested but no API key provided, using mock data");
            mock::generate_mock_data(start_date.year(), end_date.year())
        }
    } else {
        // Generate mock data for the date range
        mock::generate_mock_data(start_date.year(), end_date.year())
    };

    // Filter by date range
    let filtered_data: Vec<_> = economic_data.into_iter()
        .filter(|d| d.date >= start_date && d.date <= end_date)
        .collect();

    // Calculate with custom weights (apply as multipliers)
    let results: Vec<niv::NIVResult> = filtered_data.iter()
        .map(|data| {
            let mut result = engine.calculate(data);
            // Apply weight multipliers
            result.components.thrust *= weights.thrust;
            result.components.efficiency *= weights.efficiency;
            result.components.slack *= weights.slack;
            result.components.drag *= weights.drag;
            // Recalculate probability based on weighted components
            let weighted_niv = (result.components.thrust * result.components.efficiency)
                / (result.components.slack + result.components.drag).powf(eta);
            result.niv_score = (weighted_niv * 100.0).clamp(-100.0, 100.0);
            result.recession_probability = 1.0 / (1.0 + (result.niv_score / 10.0).exp());
            result.alert_level = niv::AlertLevel::from_probability(result.recession_probability);
            result
        })
        .collect();

    // Apply smoothing
    let smoothed = apply_custom_smoothing(&results, smooth_window);

    // Convert to response format
    let data: Vec<HistoryDataPoint> = smoothed.iter()
        .map(|r| HistoryDataPoint {
            date: r.date.to_string(),
            niv_score: round2(r.niv_score),
            recession_probability: round2(r.recession_probability * 100.0),
            alert_level: r.alert_level,
            is_recession: niv::RecessionPeriods::is_recession(r.date),
        })
        .collect();

    // Calculate summary statistics
    let summary = calculate_simulation_summary(&smoothed);

    Ok(Json(SimulateResponse {
        params: SimulationParamsResponse {
            eta,
            weights,
            smooth_window,
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
        },
        data,
        summary,
    }))
}

/// Run Monte Carlo simulation
async fn run_monte_carlo(
    State(state): State<Arc<AppState>>,
    Json(req): Json<MonteCarloRequest>,
) -> Result<Json<MonteCarloResponse>, (StatusCode, Json<ErrorResponse>)> {
    let num_draws = req.num_draws.unwrap_or(1000).min(10000); // Cap at 10k
    let window_size = req.window_size.unwrap_or(60); // 5 years default
    let confidence_level = req.confidence_level.unwrap_or(0.95);
    let eta = req.eta.unwrap_or(niv::ETA);

    // Get historical data
    let data = state.data.read().await;

    if data.len() < window_size {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Not enough historical data for Monte Carlo".to_string(),
                code: "INSUFFICIENT_DATA".to_string(),
            }),
        ));
    }

    // Current probability
    let current_prob = data.last()
        .map(|r| r.recession_probability)
        .unwrap_or(0.0);

    // Run Monte Carlo draws
    let mut draws: Vec<f64> = Vec::with_capacity(num_draws);
    let engine = niv::NIVEngine::with_eta(eta);

    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    for i in 0..num_draws {
        // Pseudo-random window selection
        let mut hasher = DefaultHasher::new();
        i.hash(&mut hasher);
        let hash = hasher.finish() as usize;
        let start_idx = hash % (data.len() - window_size);

        // Sample from window
        let window = &data[start_idx..start_idx + window_size];
        let avg_prob: f64 = window.iter()
            .map(|r| r.recession_probability)
            .sum::<f64>() / window_size as f64;

        draws.push(avg_prob * 100.0);
    }

    // Sort for percentile calculation
    draws.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    // Calculate statistics
    let mean: f64 = draws.iter().sum::<f64>() / num_draws as f64;
    let variance: f64 = draws.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / num_draws as f64;
    let std_dev = variance.sqrt();

    // Percentiles
    let percentile = |p: f64| -> f64 {
        let idx = ((num_draws as f64 * p) as usize).min(num_draws - 1);
        draws[idx]
    };

    // Create histogram buckets
    let bucket_count = 20;
    let min_val = draws.first().copied().unwrap_or(0.0);
    let max_val = draws.last().copied().unwrap_or(100.0);
    let bucket_width = (max_val - min_val) / bucket_count as f64;

    let mut buckets: Vec<MonteCarloBucket> = Vec::with_capacity(bucket_count);
    for i in 0..bucket_count {
        let range_start = min_val + i as f64 * bucket_width;
        let range_end = range_start + bucket_width;
        let count = draws.iter()
            .filter(|&&v| v >= range_start && v < range_end)
            .count();

        buckets.push(MonteCarloBucket {
            range_start: round2(range_start),
            range_end: round2(range_end),
            count,
            frequency: round3(count as f64 / num_draws as f64),
        });
    }

    Ok(Json(MonteCarloResponse {
        num_draws,
        window_size,
        current_probability: round2(current_prob * 100.0),
        distribution: MonteCarloDistribution {
            buckets,
            mean: round2(mean),
            std_dev: round2(std_dev),
        },
        percentiles: MonteCarloPercentiles {
            p5: round2(percentile(0.05)),
            p10: round2(percentile(0.10)),
            p25: round2(percentile(0.25)),
            p50: round2(percentile(0.50)),
            p75: round2(percentile(0.75)),
            p90: round2(percentile(0.90)),
            p95: round2(percentile(0.95)),
        },
    }))
}

/// Run sensitivity analysis
async fn run_sensitivity(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SensitivityRequest>,
) -> Result<Json<SensitivityResponse>, (StatusCode, Json<ErrorResponse>)> {
    let steps = req.steps.unwrap_or(20).min(50);

    // Determine parameter range based on component
    let (min_val, max_val, baseline) = match req.component.to_lowercase().as_str() {
        "eta" => (
            req.min_value.unwrap_or(0.5),
            req.max_value.unwrap_or(3.0),
            niv::ETA,
        ),
        "thrust" | "efficiency" | "slack" | "drag" => (
            req.min_value.unwrap_or(0.0),
            req.max_value.unwrap_or(2.0),
            1.0,
        ),
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: format!("Unknown component: {}. Valid: eta, thrust, efficiency, slack, drag", req.component),
                    code: "INVALID_COMPONENT".to_string(),
                }),
            ));
        }
    };

    let step_size = (max_val - min_val) / steps as f64;

    // Get latest data point
    let data = state.data.read().await;
    let latest = data.last().ok_or_else(|| (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ErrorResponse {
            error: "No data available".to_string(),
            code: "NO_DATA".to_string(),
        }),
    ))?;

    // Calculate baseline probability
    let baseline_prob = latest.recession_probability * 100.0;

    // Generate sensitivity data
    let mut sensitivity_data: Vec<SensitivityPoint> = Vec::with_capacity(steps);

    for i in 0..=steps {
        let value = min_val + i as f64 * step_size;

        // Calculate probability at this parameter value
        let prob = match req.component.to_lowercase().as_str() {
            "eta" => {
                let engine = niv::NIVEngine::with_eta(value);
                // Recalculate with new eta
                let niv_score = (latest.components.thrust * latest.components.efficiency)
                    / (latest.components.slack + latest.components.drag).powf(value);
                let normalized = (niv_score * 100.0).clamp(-100.0, 100.0);
                1.0 / (1.0 + (normalized / 10.0).exp()) * 100.0
            }
            "thrust" => {
                let weighted = latest.components.thrust * value;
                let niv_score = (weighted * latest.components.efficiency)
                    / (latest.components.slack + latest.components.drag).powf(niv::ETA);
                let normalized = (niv_score * 100.0).clamp(-100.0, 100.0);
                1.0 / (1.0 + (normalized / 10.0).exp()) * 100.0
            }
            "efficiency" => {
                let weighted = latest.components.efficiency * value;
                let niv_score = (latest.components.thrust * weighted)
                    / (latest.components.slack + latest.components.drag).powf(niv::ETA);
                let normalized = (niv_score * 100.0).clamp(-100.0, 100.0);
                1.0 / (1.0 + (normalized / 10.0).exp()) * 100.0
            }
            "slack" => {
                let weighted = latest.components.slack * value;
                let niv_score = (latest.components.thrust * latest.components.efficiency)
                    / (weighted + latest.components.drag).powf(niv::ETA);
                let normalized = (niv_score * 100.0).clamp(-100.0, 100.0);
                1.0 / (1.0 + (normalized / 10.0).exp()) * 100.0
            }
            "drag" => {
                let weighted = latest.components.drag * value;
                let niv_score = (latest.components.thrust * latest.components.efficiency)
                    / (latest.components.slack + weighted).powf(niv::ETA);
                let normalized = (niv_score * 100.0).clamp(-100.0, 100.0);
                1.0 / (1.0 + (normalized / 10.0).exp()) * 100.0
            }
            _ => baseline_prob,
        };

        sensitivity_data.push(SensitivityPoint {
            value: round3(value),
            probability: round2(prob),
            delta_from_baseline: round2(prob - baseline_prob),
        });
    }

    Ok(Json(SensitivityResponse {
        component: req.component,
        baseline_value: round3(baseline),
        baseline_probability: round2(baseline_prob),
        sensitivity_data,
    }))
}

/// Apply custom smoothing window
fn apply_custom_smoothing(results: &[niv::NIVResult], window: usize) -> Vec<niv::NIVResult> {
    if results.len() < window {
        return results.to_vec();
    }

    let mut smoothed = Vec::with_capacity(results.len());

    for i in 0..results.len() {
        if i < window - 1 {
            smoothed.push(results[i].clone());
            continue;
        }

        let window_start = i + 1 - window;
        let window_slice = &results[window_start..=i];

        let avg_niv: f64 = window_slice.iter().map(|r| r.niv_score).sum::<f64>() / window as f64;
        let avg_prob: f64 = window_slice.iter().map(|r| r.recession_probability).sum::<f64>() / window as f64;

        smoothed.push(niv::NIVResult {
            date: results[i].date,
            niv_score: avg_niv,
            recession_probability: avg_prob,
            components: results[i].components.clone(),
            alert_level: niv::AlertLevel::from_probability(avg_prob),
        });
    }

    smoothed
}

/// Calculate simulation summary statistics
fn calculate_simulation_summary(results: &[niv::NIVResult]) -> SimulationSummary {
    if results.is_empty() {
        return SimulationSummary {
            total_points: 0,
            avg_probability: 0.0,
            max_probability: 0.0,
            min_probability: 0.0,
            recessions_detected: 0,
            false_positives: 0,
            true_positives: 0,
        };
    }

    let probabilities: Vec<f64> = results.iter()
        .map(|r| r.recession_probability * 100.0)
        .collect();

    let avg = probabilities.iter().sum::<f64>() / probabilities.len() as f64;
    let max = probabilities.iter().cloned().fold(0.0f64, f64::max);
    let min = probabilities.iter().cloned().fold(100.0f64, f64::min);

    // Count recession signals (probability > 50%)
    let recession_signals: usize = results.iter()
        .filter(|r| r.recession_probability > 0.5)
        .count();

    // Count true/false positives against known recessions
    let mut true_positives = 0;
    let mut false_positives = 0;

    for r in results {
        let predicted_recession = r.recession_probability > 0.5;
        let actual_recession = niv::RecessionPeriods::is_recession(r.date);

        if predicted_recession {
            if actual_recession {
                true_positives += 1;
            } else {
                false_positives += 1;
            }
        }
    }

    SimulationSummary {
        total_points: results.len(),
        avg_probability: round2(avg),
        max_probability: round2(max),
        min_probability: round2(min),
        recessions_detected: recession_signals,
        false_positives,
        true_positives,
    }
}

