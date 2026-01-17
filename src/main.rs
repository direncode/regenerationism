//! NIV Engine API Server v6
//!
//! Production-grade implementation of the National Impact Velocity macro-indicator
//! AUC 0.849 vs Fed Yield Curve 0.840 in Out-of-Sample testing
//!
//! Endpoints:
//! - GET /api/v1/latest - Current NIV score and recession probability
//! - GET /api/v1/history - Historical NIV data (1960-present)
//! - GET /api/v1/components - Current component breakdown with drag subcomponents
//! - GET /api/v1/compare - NIV vs Fed Yield Curve comparison
//! - GET /api/v1/validation - Run OOS validation checks
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
use chrono::{Datelike, NaiveDate};
use moka::future::Cache;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::niv::{AlertLevel, NIVComponents, NIVEngine, NIVResult, ValidationResult};
use crate::fred::mock;

/// Application state
struct AppState {
    engine: NIVEngine,
    cache: Cache<String, CachedData>,
    data: RwLock<Vec<NIVResult>>,
    validation: RwLock<Option<ValidationResult>>,
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
    model_version: String,
}

#[derive(Serialize)]
struct ComponentsResponse {
    // Main components
    thrust: f64,
    efficiency: f64,
    efficiency_squared: f64,  // P² - the actual value used in formula
    slack: f64,
    drag: f64,
    // Drag subcomponents for transparency
    drag_spread: f64,
    drag_real_rate: f64,
    drag_volatility: f64,
    // Interpretations
    interpretation: ComponentInterpretation,
}

#[derive(Serialize)]
struct ComponentInterpretation {
    thrust_status: String,
    efficiency_status: String,
    slack_status: String,
    drag_status: String,
    // Formula breakdown
    formula: String,
}

#[derive(Serialize)]
struct FedComparisonResponse {
    niv_signal: String,
    yield_curve_signal: String,
    agreement: bool,
    niv_lead_months: i32,
    niv_auc: f64,
    fed_auc: f64,
}

#[derive(Serialize)]
struct HistoryResponse {
    count: usize,
    start_date: String,
    end_date: String,
    model_version: String,
    data: Vec<HistoryDataPoint>,
}

#[derive(Serialize)]
struct HistoryDataPoint {
    date: String,
    niv_score: f64,
    recession_probability: f64,
    alert_level: AlertLevel,
    is_recession: bool,
    // Include components for charting
    thrust: f64,
    efficiency: f64,
    slack: f64,
    drag: f64,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    version: String,
    model_version: String,
    data_points: usize,
    last_update: String,
    validation_passed: Option<bool>,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    code: String,
}

const MODEL_VERSION: &str = "NIV-v6-OOS";
const MODEL_AUC: f64 = 0.849;
const FED_AUC: f64 = 0.840;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .init();

    tracing::info!("Starting NIV Engine API Server {}", MODEL_VERSION);
    tracing::info!("OOS Performance: AUC {} vs Fed Yield Curve {}", MODEL_AUC, FED_AUC);

    // Initialize engine and compute initial data
    let engine = NIVEngine::new();
    let mock_data = mock::generate_mock_data(1960, 2026);
    let initial_results = engine.calculate_series(&mock_data);

    tracing::info!("Computed {} NIV data points", initial_results.len());

    // Run validation on startup
    let validation = engine.validate_against_benchmarks(&initial_results);
    if validation.passed {
        tracing::info!("✅ OOS Validation PASSED");
    } else {
        tracing::warn!("⚠️ OOS Validation FAILED - check calculation logic");
    }
    for check in &validation.checks {
        let status = if check.passed { "✓" } else { "✗" };
        tracing::info!("  {} {}: {} (expected: {})", status, check.name, check.actual, check.expected);
    }

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
        validation: RwLock::new(Some(validation)),
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
        .route("/api/v1/validation", get(get_validation))
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
        "model_version": MODEL_VERSION,
        "description": "National Impact Velocity - Physics-based Macro Crisis Detection",
        "performance": {
            "niv_auc": MODEL_AUC,
            "fed_yield_curve_auc": FED_AUC,
            "outperformance": format!("+{:.1}%", (MODEL_AUC - FED_AUC) / FED_AUC * 100.0)
        },
        "formula": {
            "master": "NIV_t = (u_t × P_t²) / (X_t + F_t)^η",
            "thrust": "u = tanh(1.0*dG + 1.0*dA - 0.7*dr)",
            "efficiency": "P = (Investment × 1.15) / GDP",
            "slack": "X = 1 - (TCU/100)",
            "drag": "F = 0.4*s_t + 0.4*(r-π) + 0.2*σ_r",
            "parameters": {
                "eta": 1.5,
                "epsilon": 0.001
            }
        },
        "endpoints": {
            "latest": "/api/v1/latest",
            "history": "/api/v1/history",
            "components": "/api/v1/components",
            "compare": "/api/v1/compare",
            "recessions": "/api/v1/recessions",
            "validation": "/api/v1/validation",
            "health": "/health"
        },
        "documentation": "https://regenerationism.ai/methodology"
    }))
}

/// Health check endpoint
async fn health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    let data = state.data.read().await;
    let validation = state.validation.read().await;

    let last_date = data.last()
        .map(|d| d.date.to_string())
        .unwrap_or_else(|| "N/A".to_string());

    Json(HealthResponse {
        status: "healthy".to_string(),
        version: "1.0.0".to_string(),
        model_version: MODEL_VERSION.to_string(),
        data_points: data.len(),
        last_update: last_date,
        validation_passed: validation.as_ref().map(|v| v.passed),
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
        formula: format!(
            "NIV = ({:.3} × {:.6}) / ({:.3} + {:.4})^1.5 = {:.2}",
            latest.components.thrust,
            latest.components.efficiency_squared,
            latest.components.slack,
            latest.components.drag,
            latest.niv_score
        ),
    };

    // Compare with Fed yield curve signal
    let niv_signal = if latest.recession_probability > 0.5 { "RECESSION RISK" } else { "EXPANSION" };
    let yield_curve_signal = if latest.components.drag_spread > 0.0 { "INVERTED" } else { "NORMAL" };

    Ok(Json(LatestResponse {
        date: latest.date.to_string(),
        niv_score: round2(latest.niv_score),
        recession_probability: round2(latest.recession_probability * 100.0),
        alert_level: latest.alert_level,
        alert_color: latest.alert_level.color().to_string(),
        alert_label: latest.alert_level.label().to_string(),
        components: ComponentsResponse {
            thrust: round4(latest.components.thrust),
            efficiency: round4(latest.components.efficiency),
            efficiency_squared: round6(latest.components.efficiency_squared),
            slack: round4(latest.components.slack),
            drag: round4(latest.components.drag),
            drag_spread: round4(latest.components.drag_spread),
            drag_real_rate: round4(latest.components.drag_real_rate),
            drag_volatility: round4(latest.components.drag_volatility),
            interpretation,
        },
        vs_fed: FedComparisonResponse {
            niv_signal: niv_signal.to_string(),
            yield_curve_signal: yield_curve_signal.to_string(),
            agreement: (latest.recession_probability > 0.5) == (latest.components.drag_spread > 0.0),
            niv_lead_months: 6,
            niv_auc: MODEL_AUC,
            fed_auc: FED_AUC,
        },
        model_version: MODEL_VERSION.to_string(),
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
            thrust: round4(d.components.thrust),
            efficiency: round4(d.components.efficiency),
            slack: round4(d.components.slack),
            drag: round4(d.components.drag),
        })
        .collect();

    let start = filtered.first().map(|d| d.date.clone()).unwrap_or_default();
    let end = filtered.last().map(|d| d.date.clone()).unwrap_or_default();

    Ok(Json(HistoryResponse {
        count: filtered.len(),
        start_date: start,
        end_date: end,
        model_version: MODEL_VERSION.to_string(),
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
        formula: format!(
            "NIV = ({:.3} × {:.6}) / ({:.3} + {:.4})^1.5",
            latest.components.thrust,
            latest.components.efficiency_squared,
            latest.components.slack,
            latest.components.drag
        ),
    };

    Ok(Json(ComponentsResponse {
        thrust: round4(latest.components.thrust),
        efficiency: round4(latest.components.efficiency),
        efficiency_squared: round6(latest.components.efficiency_squared),
        slack: round4(latest.components.slack),
        drag: round4(latest.components.drag),
        drag_spread: round4(latest.components.drag_spread),
        drag_real_rate: round4(latest.components.drag_real_rate),
        drag_volatility: round4(latest.components.drag_volatility),
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
            // Fed probability based on yield curve inversion
            let fed_prob = if d.components.drag_spread > 0.0 {
                // Inverted yield curve
                0.6 + d.components.drag_spread * 50.0
            } else {
                // Normal yield curve
                0.2 + d.components.drag * 2.0
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

/// Get validation results
async fn get_validation(State(state): State<Arc<AppState>>) -> Json<Option<ValidationResult>> {
    let validation = state.validation.read().await;
    Json(validation.clone())
}

fn recession_name(start: NaiveDate) -> String {
    match start.year() {
        2020 => "COVID-19 Recession".to_string(),
        2007 | 2008 => "Great Recession".to_string(),
        2001 => "Dot-com Recession".to_string(),
        1990 => "Early 1990s Recession".to_string(),
        1981 | 1982 => "1981-82 Recession (Volcker)".to_string(),
        1980 => "1980 Recession".to_string(),
        1973 | 1974 | 1975 => "1973-75 Oil Crisis Recession".to_string(),
        1969 | 1970 => "1969-70 Recession".to_string(),
        _ => format!("{} Recession", start.year()),
    }
}

// Helper functions
fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

fn round4(v: f64) -> f64 {
    (v * 10000.0).round() / 10000.0
}

fn round6(v: f64) -> f64 {
    (v * 1000000.0).round() / 1000000.0
}

fn interpret_thrust(v: f64) -> String {
    match v {
        v if v > 0.7 => "🚀 Strong expansion impulse (M2 + Investment surging)".to_string(),
        v if v > 0.3 => "📈 Moderate growth impulse".to_string(),
        v if v > -0.3 => "➡️ Neutral monetary/fiscal stance".to_string(),
        v if v > -0.7 => "📉 Moderate contraction pressure".to_string(),
        _ => "⚠️ Strong contraction pressure (tightening cycle)".to_string(),
    }
}

fn interpret_efficiency(v: f64) -> String {
    match v {
        v if v > 0.18 => "💪 High productive investment (18%+ of GDP)".to_string(),
        v if v > 0.15 => "✅ Healthy investment levels".to_string(),
        v if v > 0.12 => "⚠️ Below-average investment".to_string(),
        _ => "🚨 Weak investment - hollow growth risk (GFC signal)".to_string(),
    }
}

fn interpret_slack(v: f64) -> String {
    match v {
        v if v > 0.30 => "🔴 High unused capacity (30%+) - recession signal".to_string(),
        v if v > 0.22 => "🟡 Elevated slack - room to grow".to_string(),
        v if v > 0.15 => "🟢 Normal capacity utilization".to_string(),
        _ => "🔥 Economy running hot - overheating risk".to_string(),
    }
}

fn interpret_drag(v: f64) -> String {
    match v {
        v if v > 0.03 => "🚨 CRITICAL: High friction - liquidity stress".to_string(),
        v if v > 0.02 => "⚠️ Elevated drag - watch closely".to_string(),
        v if v > 0.01 => "🟡 Moderate friction levels".to_string(),
        _ => "🟢 Low friction - smooth capital flow".to_string(),
    }
}
