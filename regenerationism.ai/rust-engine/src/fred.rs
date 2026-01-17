//! FRED (Federal Reserve Economic Data) API Client
//!
//! Fetches real-time economic indicators for NIV calculation:
//! - GPDIC1: Real Gross Private Domestic Investment (Thrust - Investment growth)
//! - M2SL: M2 Money Stock (Thrust - Monetary stimulus)
//! - FEDFUNDS: Federal Funds Effective Rate (Thrust - Rate changes)
//! - GDPC1: Real GDP (Efficiency normalization)
//! - TCU: Total Capacity Utilization (Slack)
//! - T10Y3M: 10Y-3M Treasury Spread (Drag - Inversion penalty)
//! - CPIAUCSL: CPI for Inflation (Drag - Real rate calculation)

use chrono::{Datelike, NaiveDate};
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

/// Mock data generator for testing and development
/// This generates REALISTIC economic data that simulates actual FRED series behavior
pub mod mock {
    use super::*;

    /// Generate mock economic data with realistic patterns
    /// This includes proper simulation of:
    /// - 2020 M2 explosion (critical for detecting COVID crash)
    /// - 2008 GFC patterns
    /// - Normal business cycles
    /// - Yield curve inversions
    /// - Fed rate hiking cycles
    pub fn generate_mock_data(start_year: i32, end_year: i32) -> Vec<EconomicData> {
        let mut data = Vec::new();

        // Base values (roughly 2019 levels)
        let base_investment = 3500.0;  // Billions
        let base_m2 = 15000.0;         // Billions
        let base_gdp = 21500.0;        // Billions
        let _base_cpi = 255.0;          // Index (unused, inflation is YoY %)

        for year in start_year..=end_year {
            for month in 1..=12 {
                let date = match NaiveDate::from_ymd_opt(year, month, 1) {
                    Some(d) => d,
                    None => continue,
                };

                // Years since 1980 for trend
                let years_since_1980 = (year - 1980) as f64 + (month as f64 - 1.0) / 12.0;

                // Business cycle (roughly 7-year cycle)
                let cycle_phase = (years_since_1980 * 2.0 * std::f64::consts::PI / 7.0).sin();

                // ═══════════════════════════════════════════════════════════
                // INVESTMENT (GPDIC1) - grows ~3% annually with cycle
                // ═══════════════════════════════════════════════════════════
                let investment_trend = base_investment * (1.03_f64).powf(years_since_1980 - 39.0);
                let mut investment = investment_trend * (1.0 + cycle_phase * 0.15);

                // ═══════════════════════════════════════════════════════════
                // M2 MONEY SUPPLY - grows ~6% annually normally
                // CRITICAL: Massive spike in 2020 (25% YoY growth!)
                // ═══════════════════════════════════════════════════════════
                let m2_trend = base_m2 * (1.06_f64).powf(years_since_1980 - 39.0);
                let mut m2 = m2_trend;

                // 2020 M2 explosion (COVID stimulus)
                if year == 2020 {
                    let covid_factor = match month {
                        1..=2 => 1.0,
                        3 => 1.05,
                        4 => 1.12,
                        5 => 1.18,
                        6 => 1.22,
                        7..=12 => 1.25,
                        _ => 1.0,
                    };
                    m2 *= covid_factor;
                } else if year == 2021 {
                    m2 *= 1.25; // Sustained high M2
                } else if year >= 2022 {
                    m2 *= 1.22; // Slight M2 contraction
                }

                // ═══════════════════════════════════════════════════════════
                // GDP (GDPC1) - grows ~2.5% annually
                // ═══════════════════════════════════════════════════════════
                let gdp_trend = base_gdp * (1.025_f64).powf(years_since_1980 - 39.0);
                let mut gdp = gdp_trend * (1.0 + cycle_phase * 0.05);

                // ═══════════════════════════════════════════════════════════
                // CAPACITY UTILIZATION (TCU) - cycles 70-85%
                // ═══════════════════════════════════════════════════════════
                let mut capacity = 77.0 + cycle_phase * 5.0;

                // ═══════════════════════════════════════════════════════════
                // FED FUNDS RATE - policy cycles
                // ═══════════════════════════════════════════════════════════
                let mut fed_funds = match year {
                    y if y < 1985 => 10.0 + cycle_phase * 5.0,  // Volcker era
                    1985..=1989 => 7.0 + cycle_phase * 2.0,
                    1990..=1992 => 5.0 - (1992 - year) as f64,  // Early 90s easing
                    1993..=1999 => 5.0 + cycle_phase * 1.0,
                    2000..=2003 => 3.0 - (year - 2000) as f64 * 0.5,  // Dot-com response
                    2004..=2006 => 2.0 + (year - 2004) as f64 * 1.5,  // Hiking
                    2007..=2008 => 4.0 - (year - 2007) as f64 * 2.0,  // GFC cuts
                    2009..=2015 => 0.25,  // ZIRP
                    2016..=2018 => 0.25 + (year - 2016) as f64 * 0.75,  // Normalization
                    2019 => 2.0,
                    2020 => 0.25,  // COVID cuts
                    2021 => 0.25,
                    2022 => 2.0 + month as f64 * 0.3,  // Aggressive hiking
                    2023 => 5.0 + (month as f64 - 6.0).max(0.0) * 0.1,
                    2024..=2025 => 5.25,  // Peak rates
                    _ => 4.0 + cycle_phase * 2.0,
                };

                // ═══════════════════════════════════════════════════════════
                // CPI INFLATION - YoY % change
                // ═══════════════════════════════════════════════════════════
                let cpi_inflation = match year {
                    y if y < 1985 => 6.0 + cycle_phase * 4.0,  // High inflation era
                    1985..=2019 => 2.5 + cycle_phase * 1.0,    // Great Moderation
                    2020 => 1.5,  // COVID deflation scare
                    2021 => 4.0 + month as f64 * 0.3,  // Inflation building
                    2022 => 8.0 - (month as f64 - 6.0).max(0.0) * 0.3,  // Peak inflation
                    2023 => 4.0 - month as f64 * 0.15,  // Disinflation
                    2024..=2025 => 2.8,  // Near target
                    _ => 2.5 + cycle_phase * 1.0,
                };

                // ═══════════════════════════════════════════════════════════
                // YIELD SPREAD (T10Y3M) - inversions before recessions
                // ═══════════════════════════════════════════════════════════
                let mut yield_spread = match year {
                    2000 => -0.5,  // Pre dot-com
                    2006..=2007 => -0.3,  // Pre GFC
                    2019 => -0.2,  // Pre COVID
                    2022..=2023 => -1.0,  // Deep inversion
                    _ => 1.0 + cycle_phase * 0.5,  // Normal upward sloping
                };

                // ═══════════════════════════════════════════════════════════
                // RECESSION ADJUSTMENTS
                // ═══════════════════════════════════════════════════════════
                if is_recession_period(year, month) {
                    investment *= 0.85;  // Investment collapses
                    gdp *= 0.97;         // GDP contracts
                    capacity -= 10.0;    // Slack increases
                    yield_spread -= 0.5; // Spread often inverted before
                }

                // 2008 GFC specific
                if year == 2008 && month >= 9 {
                    investment *= 0.75;
                    gdp *= 0.95;
                    capacity = 70.0;
                    fed_funds = 1.0 - (month - 9) as f64 * 0.2;
                }

                // 2020 COVID specific
                if year == 2020 && (month >= 3 && month <= 5) {
                    investment *= 0.70;
                    gdp *= 0.90;
                    capacity = 64.0 + (month - 3) as f64 * 3.0;
                    fed_funds = 0.25;
                }

                // Clamp values to realistic ranges
                capacity = capacity.clamp(60.0, 90.0);
                fed_funds = fed_funds.max(0.0);

                data.push(EconomicData {
                    date,
                    investment,
                    m2_supply: m2,
                    fed_funds_rate: fed_funds,
                    gdp,
                    capacity_util: capacity,
                    yield_spread,
                    cpi_inflation,
                });
            }
        }

        data
    }

    /// Check if date falls in a known recession period
    fn is_recession_period(year: i32, month: u32) -> bool {
        matches!(
            (year, month),
            // Great Recession
            (2008, 1..=12) | (2009, 1..=6) |
            // COVID
            (2020, 2..=4) |
            // Dot-com
            (2001, 3..=11) |
            // Early 90s
            (1990, 7..=12) | (1991, 1..=3) |
            // Early 80s double-dip
            (1980, 1..=7) | (1981, 7..=12) | (1982, 1..=11) |
            // 1973-75 Oil Crisis
            (1973, 11..=12) | (1974, 1..=12) | (1975, 1..=3) |
            // 1969-70
            (1969, 12..=12) | (1970, 1..=11)
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
        assert!(data.len() >= 280); // ~25 years * 12 months
    }

    #[test]
    fn test_mock_data_has_2020_m2_spike() {
        let data = mock::generate_mock_data(2019, 2021);

        // Find 2019 and 2020 M2 values
        let m2_2019: Vec<f64> = data.iter()
            .filter(|d| d.date.year() == 2019)
            .map(|d| d.m2_supply)
            .collect();

        let m2_2020_q4: Vec<f64> = data.iter()
            .filter(|d| d.date.year() == 2020 && d.date.month() >= 6)
            .map(|d| d.m2_supply)
            .collect();

        let avg_2019 = m2_2019.iter().sum::<f64>() / m2_2019.len() as f64;
        let avg_2020_q4 = m2_2020_q4.iter().sum::<f64>() / m2_2020_q4.len() as f64;

        // M2 should have grown significantly (>20% YoY)
        let growth = (avg_2020_q4 - avg_2019) / avg_2019 * 100.0;
        assert!(growth > 15.0, "M2 growth was only {:.1}%, expected >15%", growth);
    }

    #[test]
    fn test_mock_data_has_yield_curve_inversions() {
        let data = mock::generate_mock_data(2019, 2023);

        // Check for negative spreads in 2022-2023
        let inversions: Vec<&EconomicData> = data.iter()
            .filter(|d| d.date.year() >= 2022 && d.yield_spread < 0.0)
            .collect();

        assert!(!inversions.is_empty(), "Expected yield curve inversions in 2022-2023");
    }

    #[test]
    fn test_mock_data_recessions() {
        let data = mock::generate_mock_data(2007, 2010);

        // Find 2008 data
        let crisis_data: Vec<_> = data.iter()
            .filter(|d| d.date.year() == 2008)
            .collect();

        assert!(!crisis_data.is_empty());

        // Capacity should drop during GFC
        let min_capacity = crisis_data.iter()
            .map(|d| d.capacity_util)
            .fold(f64::INFINITY, f64::min);

        assert!(min_capacity < 75.0, "Capacity util should drop below 75% during GFC");
    }
}
