//! FRED (Federal Reserve Economic Data) API Client
//! 
//! Fetches real-time economic indicators:
//! - GPDIC1: Private Domestic Investment
//! - M2SL: M2 Money Supply  
//! - FEDFUNDS: Federal Funds Rate
//! - GDPMC1: Real GDP
//! - TCU: Total Capacity Utilization
//! - T10Y3M: 10Y-3M Treasury Spread
//! - CPIAUCSL: CPI for Inflation

use chrono::NaiveDate;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;

use crate::niv::EconomicData;

const FRED_BASE_URL: &str = "https://api.stlouisfed.org/fred/series/observations";

/// FRED API response structure
#[derive(Debug, Deserialize)]
struct FredResponse {
    observations: Vec<FredObservation>,
}

#[derive(Debug, Deserialize)]
struct FredObservation {
    date: String,
    value: String,
}

/// FRED series IDs
#[derive(Debug, Clone, Copy)]
pub enum FredSeries {
    Investment,      // GPDIC1
    M2Supply,        // M2SL
    FedFundsRate,    // FEDFUNDS
    RealGDP,         // GDPC1
    CapacityUtil,    // TCU
    YieldSpread,     // T10Y3M
    CPI,             // CPIAUCSL
}

impl FredSeries {
    pub fn series_id(&self) -> &'static str {
        match self {
            FredSeries::Investment => "GPDIC1",
            FredSeries::M2Supply => "M2SL",
            FredSeries::FedFundsRate => "FEDFUNDS",
            FredSeries::RealGDP => "GDPC1",
            FredSeries::CapacityUtil => "TCU",
            FredSeries::YieldSpread => "T10Y3M",
            FredSeries::CPI => "CPIAUCSL",
        }
    }
    
    pub fn all() -> Vec<FredSeries> {
        vec![
            FredSeries::Investment,
            FredSeries::M2Supply,
            FredSeries::FedFundsRate,
            FredSeries::RealGDP,
            FredSeries::CapacityUtil,
            FredSeries::YieldSpread,
            FredSeries::CPI,
        ]
    }
}

/// FRED API Client
pub struct FredClient {
    client: Client,
    api_key: String,
}

impl FredClient {
    pub fn new() -> Result<Self, FredError> {
        let api_key = env::var("FRED_API_KEY")
            .map_err(|_| FredError::MissingApiKey)?;
        
        Ok(Self {
            client: Client::new(),
            api_key,
        })
    }
    
    pub fn with_api_key(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }
    
    /// Fetch a single FRED series
    pub async fn fetch_series(
        &self,
        series: FredSeries,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> Result<Vec<(NaiveDate, f64)>, FredError> {
        let mut url = format!(
            "{}?series_id={}&api_key={}&file_type=json",
            FRED_BASE_URL,
            series.series_id(),
            self.api_key
        );
        
        if let Some(start) = start_date {
            url.push_str(&format!("&observation_start={}", start));
        }
        
        if let Some(end) = end_date {
            url.push_str(&format!("&observation_end={}", end));
        }
        
        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| FredError::NetworkError(e.to_string()))?;
        
        if !response.status().is_success() {
            return Err(FredError::ApiError(format!(
                "FRED API returned status: {}",
                response.status()
            )));
        }
        
        let fred_response: FredResponse = response
            .json()
            .await
            .map_err(|e| FredError::ParseError(e.to_string()))?;
        
        let mut data = Vec::new();
        for obs in fred_response.observations {
            // Skip missing values (FRED uses "." for missing)
            if obs.value == "." {
                continue;
            }
            
            let date = NaiveDate::parse_from_str(&obs.date, "%Y-%m-%d")
                .map_err(|e| FredError::ParseError(e.to_string()))?;
            
            let value: f64 = obs.value
                .parse()
                .map_err(|e: std::num::ParseFloatError| FredError::ParseError(e.to_string()))?;
            
            data.push((date, value));
        }
        
        Ok(data)
    }
    
    /// Fetch all series and merge into EconomicData
    pub async fn fetch_all(
        &self,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> Result<Vec<EconomicData>, FredError> {
        // Fetch all series concurrently
        let (investment, m2, fed_funds, gdp, capacity, spread, cpi) = tokio::try_join!(
            self.fetch_series(FredSeries::Investment, start_date, end_date),
            self.fetch_series(FredSeries::M2Supply, start_date, end_date),
            self.fetch_series(FredSeries::FedFundsRate, start_date, end_date),
            self.fetch_series(FredSeries::RealGDP, start_date, end_date),
            self.fetch_series(FredSeries::CapacityUtil, start_date, end_date),
            self.fetch_series(FredSeries::YieldSpread, start_date, end_date),
            self.fetch_series(FredSeries::CPI, start_date, end_date),
        )?;
        
        // Convert to hashmaps for merging
        let investment_map: HashMap<NaiveDate, f64> = investment.into_iter().collect();
        let m2_map: HashMap<NaiveDate, f64> = m2.into_iter().collect();
        let fed_funds_map: HashMap<NaiveDate, f64> = fed_funds.into_iter().collect();
        let gdp_map: HashMap<NaiveDate, f64> = gdp.into_iter().collect();
        let capacity_map: HashMap<NaiveDate, f64> = capacity.into_iter().collect();
        let spread_map: HashMap<NaiveDate, f64> = spread.into_iter().collect();
        let cpi_map: HashMap<NaiveDate, f64> = cpi.into_iter().collect();
        
        // Get all unique dates
        let mut all_dates: Vec<NaiveDate> = capacity_map.keys().cloned().collect();
        all_dates.sort();
        
        // Merge data, interpolating where necessary
        let mut result = Vec::new();
        let mut last_values = LastValues::default();
        
        for date in all_dates {
            // Get values or use last known
            let inv = investment_map.get(&date).copied()
                .or_else(|| Self::find_nearest(&investment_map, date))
                .unwrap_or(last_values.investment);
            let m2 = m2_map.get(&date).copied()
                .or_else(|| Self::find_nearest(&m2_map, date))
                .unwrap_or(last_values.m2);
            let ff = fed_funds_map.get(&date).copied()
                .or_else(|| Self::find_nearest(&fed_funds_map, date))
                .unwrap_or(last_values.fed_funds);
            let g = gdp_map.get(&date).copied()
                .or_else(|| Self::find_nearest(&gdp_map, date))
                .unwrap_or(last_values.gdp);
            let cap = capacity_map.get(&date).copied()
                .unwrap_or(last_values.capacity);
            let spr = spread_map.get(&date).copied()
                .or_else(|| Self::find_nearest(&spread_map, date))
                .unwrap_or(last_values.spread);
            let c = cpi_map.get(&date).copied()
                .or_else(|| Self::find_nearest(&cpi_map, date))
                .unwrap_or(last_values.cpi);
            
            // Calculate YoY inflation from CPI
            let inflation = Self::calculate_yoy_change(&cpi_map, date).unwrap_or(2.5);
            
            // Update last values
            last_values = LastValues {
                investment: inv,
                m2,
                fed_funds: ff,
                gdp: g,
                capacity: cap,
                spread: spr,
                cpi: c,
            };
            
            // Skip if we don't have minimum required data
            if g < 100.0 || cap < 1.0 {
                continue;
            }
            
            result.push(EconomicData {
                date,
                investment: inv,
                m2_supply: m2,
                fed_funds_rate: ff,
                gdp: g,
                capacity_util: cap,
                yield_spread: spr,
                cpi_inflation: inflation,
            });
        }
        
        Ok(result)
    }
    
    /// Find nearest date value in a hashmap
    fn find_nearest(map: &HashMap<NaiveDate, f64>, target: NaiveDate) -> Option<f64> {
        let mut closest: Option<(i64, f64)> = None;
        
        for (date, value) in map {
            let diff = (*date - target).num_days().abs();
            if diff <= 90 { // Within 90 days
                match closest {
                    None => closest = Some((diff, *value)),
                    Some((d, _)) if diff < d => closest = Some((diff, *value)),
                    _ => {}
                }
            }
        }
        
        closest.map(|(_, v)| v)
    }
    
    /// Calculate year-over-year change
    fn calculate_yoy_change(map: &HashMap<NaiveDate, f64>, date: NaiveDate) -> Option<f64> {
        let current = map.get(&date)?;
        
        // Find value from ~12 months ago
        let target_date = date - chrono::Duration::days(365);
        let year_ago = Self::find_nearest(map, target_date)?;
        
        if year_ago.abs() < 0.01 {
            return None;
        }
        
        Some(((current - year_ago) / year_ago) * 100.0)
    }
}

/// Track last known values for interpolation
#[derive(Default)]
struct LastValues {
    investment: f64,
    m2: f64,
    fed_funds: f64,
    gdp: f64,
    capacity: f64,
    spread: f64,
    cpi: f64,
}

/// FRED client errors
#[derive(Debug)]
pub enum FredError {
    MissingApiKey,
    NetworkError(String),
    ApiError(String),
    ParseError(String),
}

impl std::fmt::Display for FredError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FredError::MissingApiKey => write!(f, "FRED_API_KEY environment variable not set"),
            FredError::NetworkError(e) => write!(f, "Network error: {}", e),
            FredError::ApiError(e) => write!(f, "FRED API error: {}", e),
            FredError::ParseError(e) => write!(f, "Parse error: {}", e),
        }
    }
}

impl std::error::Error for FredError {}

/// Mock data for testing and development
pub mod mock {
    use super::*;
    
    /// Generate mock economic data for testing
    pub fn generate_mock_data(start_year: i32, end_year: i32) -> Vec<EconomicData> {
        let mut data = Vec::new();
        
        for year in start_year..=end_year {
            for month in 1..=12 {
                let date = match NaiveDate::from_ymd_opt(year, month, 1) {
                    Some(d) => d,
                    None => continue,
                };
                
                // Base values with some variation
                let cycle = ((year - 1960) as f64 * 0.5 + month as f64 * 0.1).sin();
                let trend = (year - 1960) as f64 * 100.0;
                
                // Simulate recession periods
                let recession_factor = if is_recession_period(year, month) {
                    0.7
                } else {
                    1.0
                };
                
                data.push(EconomicData {
                    date,
                    investment: (3000.0 + trend + cycle * 500.0) * recession_factor,
                    m2_supply: 5000.0 + trend * 20.0,
                    fed_funds_rate: 4.0 + cycle * 2.0 + if year > 2020 { 3.0 } else { 0.0 },
                    gdp: (10000.0 + trend * 15.0) * recession_factor,
                    capacity_util: (78.0 + cycle * 5.0) * recession_factor,
                    yield_spread: cycle * 1.5 - if is_recession_period(year, month) { 1.0 } else { 0.0 },
                    cpi_inflation: 2.5 + cycle * 1.5,
                });
            }
        }
        
        data
    }
    
    /// Check if date falls in a known recession period
    fn is_recession_period(year: i32, month: u32) -> bool {
        matches!(
            (year, month),
            (2008, 1..=12) | (2009, 1..=6) |  // Great Recession
            (2020, 2..=4) |                    // COVID
            (2001, 3..=11) |                   // Dot-com
            (1990, 7..=12) | (1991, 1..=3) |   // Early 90s
            (1981, 7..=12) | (1982, 1..=11)    // Early 80s
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_mock_data_generation() {
        let data = mock::generate_mock_data(2000, 2024);
        assert!(!data.is_empty());
        assert!(data.len() > 200); // ~25 years * 12 months
    }
    
    #[test]
    fn test_mock_data_recessions() {
        let data = mock::generate_mock_data(2007, 2010);
        
        // Find 2008 data
        let crisis_data: Vec<_> = data.iter()
            .filter(|d| d.date.year() == 2008)
            .collect();
        
        assert!(!crisis_data.is_empty());
        
        // GDP should be lower during recession
        let avg_gdp: f64 = crisis_data.iter().map(|d| d.gdp).sum::<f64>() / crisis_data.len() as f64;
        let pre_crisis: Vec<_> = data.iter().filter(|d| d.date.year() == 2007).collect();
        let pre_avg: f64 = pre_crisis.iter().map(|d| d.gdp).sum::<f64>() / pre_crisis.len() as f64;
        
        assert!(avg_gdp < pre_avg);
    }
}
