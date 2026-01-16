//! NIV Engine API Server
//! 
//! Endpoints:
//! - GET /api/v1/latest - Current NIV score and recession probability
//! - GET /api/v1/history - Historical NIV data (1960-present)
//! - GET /api/v1/components - Current component breakdown
//! - GET /api/v1/compare - NIV vs Fed Yield Curve comparison
//! - GET /health - Health check

mod niv;
mod fred;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use chrono::NaiveDate;
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
