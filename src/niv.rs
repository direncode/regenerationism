//! NIV (National Impact Velocity) Core Calculation Engine
//! 
//! Master Formula: NIV_t = (u_t * P_t^2) / (X_t + F_t)^η
//! 
//! Where:
//! - u (Thrust): tanh(Fiscal + Monetary - Rates)
//! - P (Efficiency): (Investment + R&D) / GDP (squared to punish hollow growth)
//! - X (Slack): 1 - Capacity Utilization
//! - F (Drag): Spread + Real Rates + Volatility

use chrono::{DateTime, Utc, NaiveDate};
use serde::{Deserialize, Serialize};

/// NIV calculation parameters
pub const SMOOTH_WINDOW: usize = 12; // 12-month smoothing
pub const LAG_WINDOW: usize = 12;    // 12-month lag
pub const ETA: f64 = 1.5;            // Friction exponent

/// Raw economic data point from FRED
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EconomicData {
    pub date: NaiveDate,
    pub investment: f64,      // GPDIC1 - Private Domestic Investment
    pub m2_supply: f64,       // M2SL - M2 Money Supply
    pub fed_funds_rate: f64,  // FEDFUNDS - Federal Funds Rate
    pub gdp: f64,             // GDPMC1 - Real GDP
    pub capacity_util: f64,   // TCU - Total Capacity Utilization
    pub yield_spread: f64,    // 10Y-3M spread
    pub cpi_inflation: f64,   // CPI Inflation rate
}

/// Computed NIV components
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NIVComponents {
    pub thrust: f64,          // u - Monetary/Fiscal impulse
    pub efficiency: f64,      // P - Investment efficiency
    pub slack: f64,           // X - Unused capacity
    pub drag: f64,            // F - Economic friction
}

/// Full NIV result for a single period
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NIVResult {
    pub date: NaiveDate,
    pub niv_score: f64,
    pub recession_probability: f64,
    pub components: NIVComponents,
    pub alert_level: AlertLevel,
}

/// Alert levels based on recession probability
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AlertLevel {
    Normal,    // < 30%
    Elevated,  // 30-50%
    Warning,   // 50-70%
    Critical,  // > 70%
}

impl AlertLevel {
    pub fn from_probability(prob: f64) -> Self {
        match prob {
            p if p < 0.30 => AlertLevel::Normal,
            p if p < 0.50 => AlertLevel::Elevated,
            p if p < 0.70 => AlertLevel::Warning,
            _ => AlertLevel::Critical,
        }
    }
    
    pub fn color(&self) -> &'static str {
        match self {
            AlertLevel::Normal => "#22c55e",   // Green
            AlertLevel::Elevated => "#eab308", // Yellow
            AlertLevel::Warning => "#f97316",  // Orange
            AlertLevel::Critical => "#ef4444", // Red
        }
    }
    
    pub fn label(&self) -> &'static str {
        match self {
            AlertLevel::Normal => "Normal",
            AlertLevel::Elevated => "Elevated",
            AlertLevel::Warning => "Warning",
            AlertLevel::Critical => "CRITICAL",
        }
    }
}

/// NIV Calculation Engine
pub struct NIVEngine {
    eta: f64,
}

impl NIVEngine {
    pub fn new() -> Self {
        Self { eta: ETA }
    }
    
    pub fn with_eta(eta: f64) -> Self {
        Self { eta }
    }
    
    /// Calculate NIV for a single data point
    pub fn calculate(&self, data: &EconomicData) -> NIVResult {
        let components = self.compute_components(data);
        let niv_score = self.compute_niv(&components);
        let recession_probability = self.compute_recession_probability(niv_score, &components);
        let alert_level = AlertLevel::from_probability(recession_probability);
        
        NIVResult {
            date: data.date,
            niv_score,
            recession_probability,
            components,
            alert_level,
        }
    }
    
    /// Calculate NIV for a time series with smoothing
    pub fn calculate_series(&self, data: &[EconomicData]) -> Vec<NIVResult> {
        if data.is_empty() {
            return Vec::new();
        }
        
        // First pass: raw calculations
        let raw_results: Vec<NIVResult> = data.iter()
            .map(|d| self.calculate(d))
            .collect();
        
        // Second pass: apply smoothing
        self.apply_smoothing(&raw_results)
    }
    
    /// Compute NIV components from raw data
    fn compute_components(&self, data: &EconomicData) -> NIVComponents {
        // Thrust (u): tanh(Fiscal + Monetary - Rates)
        // Fiscal impulse approximated by investment growth
        // Monetary impulse from M2 growth
        let fiscal_impulse = (data.investment / data.gdp).min(0.5).max(-0.5);
        let monetary_impulse = (data.m2_supply / data.gdp * 0.1).min(0.5).max(-0.5);
        let rate_drag = (data.fed_funds_rate / 100.0).min(0.3).max(0.0);
        let thrust = (fiscal_impulse + monetary_impulse - rate_drag).tanh();
        
        // Efficiency (P): (Investment + R&D) / GDP
        // Squared to punish hollow growth
        let efficiency_raw = (data.investment / data.gdp).max(0.01);
        let efficiency = efficiency_raw.powi(2);
        
        // Slack (X): 1 - Capacity Utilization
        let slack = (1.0 - data.capacity_util / 100.0).max(0.01);
        
        // Drag (F): Spread + Real Rates + Volatility proxy
        let real_rate = (data.fed_funds_rate - data.cpi_inflation).max(0.0) / 100.0;
        let spread_component = data.yield_spread.abs() / 100.0;
        let drag = (spread_component + real_rate + 0.01).max(0.01);
        
        NIVComponents {
            thrust,
            efficiency,
            slack,
            drag,
        }
    }
    
    /// Compute NIV score from components
    /// NIV = (u * P^2) / (X + F)^η
    fn compute_niv(&self, components: &NIVComponents) -> f64 {
        let numerator = components.thrust * components.efficiency;
        let denominator = (components.slack + components.drag).powf(self.eta);
        
        if denominator.abs() < 1e-10 {
            return 0.0;
        }
        
        // Normalize to roughly 0-100 scale
        let raw_niv = numerator / denominator;
        (raw_niv * 100.0).clamp(-100.0, 100.0)
    }
    
    /// Convert NIV score to recession probability
    fn compute_recession_probability(&self, niv_score: f64, components: &NIVComponents) -> f64 {
        // Base probability from NIV score
        // Negative NIV = higher recession risk
        let base_prob = 1.0 / (1.0 + (niv_score / 10.0).exp());
        
        // Adjust for extreme drag (liquidity crisis signal)
        let drag_adjustment = if components.drag > 0.05 {
            (components.drag - 0.05) * 2.0
        } else {
            0.0
        };
        
        // Adjust for negative thrust (policy tightening)
        let thrust_adjustment = if components.thrust < 0.0 {
            components.thrust.abs() * 0.3
        } else {
            0.0
        };
        
        (base_prob + drag_adjustment + thrust_adjustment).clamp(0.0, 1.0)
    }
    
    /// Apply rolling window smoothing
    fn apply_smoothing(&self, results: &[NIVResult]) -> Vec<NIVResult> {
        let n = results.len();
        if n < SMOOTH_WINDOW {
            return results.to_vec();
        }
        
        let mut smoothed = Vec::with_capacity(n);
        
        for i in 0..n {
            if i < SMOOTH_WINDOW - 1 {
                smoothed.push(results[i].clone());
                continue;
            }
            
            // Calculate smoothed values
            let window_start = i + 1 - SMOOTH_WINDOW;
            let window = &results[window_start..=i];
            
            let avg_niv: f64 = window.iter().map(|r| r.niv_score).sum::<f64>() / SMOOTH_WINDOW as f64;
            let avg_prob: f64 = window.iter().map(|r| r.recession_probability).sum::<f64>() / SMOOTH_WINDOW as f64;
            
            let avg_thrust: f64 = window.iter().map(|r| r.components.thrust).sum::<f64>() / SMOOTH_WINDOW as f64;
            let avg_efficiency: f64 = window.iter().map(|r| r.components.efficiency).sum::<f64>() / SMOOTH_WINDOW as f64;
            let avg_slack: f64 = window.iter().map(|r| r.components.slack).sum::<f64>() / SMOOTH_WINDOW as f64;
            let avg_drag: f64 = window.iter().map(|r| r.components.drag).sum::<f64>() / SMOOTH_WINDOW as f64;
            
            smoothed.push(NIVResult {
                date: results[i].date,
                niv_score: avg_niv,
                recession_probability: avg_prob,
                components: NIVComponents {
                    thrust: avg_thrust,
                    efficiency: avg_efficiency,
                    slack: avg_slack,
                    drag: avg_drag,
                },
                alert_level: AlertLevel::from_probability(avg_prob),
            });
        }
        
        smoothed
    }
}

impl Default for NIVEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Historical recession periods for validation
pub struct RecessionPeriods;

impl RecessionPeriods {
    /// Known NBER recession periods
    pub fn known_recessions() -> Vec<(NaiveDate, NaiveDate)> {
        vec![
            // Great Recession
            (NaiveDate::from_ymd_opt(2007, 12, 1).unwrap(), 
             NaiveDate::from_ymd_opt(2009, 6, 1).unwrap()),
            // COVID Recession
            (NaiveDate::from_ymd_opt(2020, 2, 1).unwrap(), 
             NaiveDate::from_ymd_opt(2020, 4, 1).unwrap()),
            // Early 2000s
            (NaiveDate::from_ymd_opt(2001, 3, 1).unwrap(), 
             NaiveDate::from_ymd_opt(2001, 11, 1).unwrap()),
            // Early 1990s
            (NaiveDate::from_ymd_opt(1990, 7, 1).unwrap(), 
             NaiveDate::from_ymd_opt(1991, 3, 1).unwrap()),
            // Early 1980s (double dip)
            (NaiveDate::from_ymd_opt(1981, 7, 1).unwrap(), 
             NaiveDate::from_ymd_opt(1982, 11, 1).unwrap()),
            (NaiveDate::from_ymd_opt(1980, 1, 1).unwrap(), 
             NaiveDate::from_ymd_opt(1980, 7, 1).unwrap()),
            // 1970s
            (NaiveDate::from_ymd_opt(1973, 11, 1).unwrap(), 
             NaiveDate::from_ymd_opt(1975, 3, 1).unwrap()),
            // Late 1960s
            (NaiveDate::from_ymd_opt(1969, 12, 1).unwrap(), 
             NaiveDate::from_ymd_opt(1970, 11, 1).unwrap()),
        ]
    }
    
    /// Check if a date falls within a recession
    pub fn is_recession(date: NaiveDate) -> bool {
        Self::known_recessions()
            .iter()
            .any(|(start, end)| date >= *start && date <= *end)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn sample_data() -> EconomicData {
        EconomicData {
            date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            investment: 4000.0,
            m2_supply: 21000.0,
            fed_funds_rate: 5.25,
            gdp: 28000.0,
            capacity_util: 78.5,
            yield_spread: -0.5,
            cpi_inflation: 3.2,
        }
    }
    
    #[test]
    fn test_niv_calculation() {
        let engine = NIVEngine::new();
        let data = sample_data();
        let result = engine.calculate(&data);
        
        assert!(result.niv_score.is_finite());
        assert!(result.recession_probability >= 0.0 && result.recession_probability <= 1.0);
    }
    
    #[test]
    fn test_alert_levels() {
        assert_eq!(AlertLevel::from_probability(0.2), AlertLevel::Normal);
        assert_eq!(AlertLevel::from_probability(0.4), AlertLevel::Elevated);
        assert_eq!(AlertLevel::from_probability(0.6), AlertLevel::Warning);
        assert_eq!(AlertLevel::from_probability(0.8), AlertLevel::Critical);
    }
    
    #[test]
    fn test_crisis_detection() {
        let engine = NIVEngine::new();
        
        // Simulate 2008-like conditions
        let crisis_data = EconomicData {
            date: NaiveDate::from_ymd_opt(2008, 9, 1).unwrap(),
            investment: 2500.0,  // Collapsed
            m2_supply: 8000.0,
            fed_funds_rate: 2.0,
            gdp: 14000.0,
            capacity_util: 68.0,  // Low utilization
            yield_spread: 3.5,    // Wide spread (stress)
            cpi_inflation: 4.5,
        };
        
        let result = engine.calculate(&crisis_data);
        
        // Should detect elevated risk
        assert!(result.recession_probability > 0.4);
    }
}
