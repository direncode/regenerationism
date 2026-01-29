"""
UFE Hook - Real-time FRED data sync with Undercurrent Flux Engine

Fetches real economic data from FRED API, computes NIV metrics,
and pushes to UFE for latent space analysis and energy computation.
"""

import os
import math
import threading
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import httpx

from ufe_integration import (
    UFEIntegration,
    NIVDataPoint,
    EconomicData,
    NIVComponents
)


class FREDFetcher:
    """Fetches real economic data from FRED (Federal Reserve Economic Data)."""

    BASE_URL = "https://api.stlouisfed.org/fred/series/observations"

    # Required FRED series for NIV computation
    SERIES = {
        "GPDIC1": "investment",      # Real Gross Private Domestic Investment
        "M2SL": "m2_supply",         # M2 Money Stock
        "FEDFUNDS": "fed_funds_rate", # Federal Funds Effective Rate
        "GDPC1": "gdp",              # Real GDP
        "TCU": "capacity_util",      # Total Capacity Utilization
        "T10Y3M": "yield_spread",    # 10Y-3M Treasury Spread
        "CPIAUCSL": "cpi",           # Consumer Price Index
    }

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize FRED fetcher.

        Args:
            api_key: FRED API key. Falls back to FRED_API_KEY env var.
        """
        self.api_key = api_key or os.environ.get("FRED_API_KEY")
        self.client = httpx.Client(timeout=30.0)
        self._cache: Dict[str, List[Dict]] = {}

    def fetch_series(
        self,
        series_id: str,
        start_date: str,
        end_date: str
    ) -> List[Dict[str, Any]]:
        """Fetch a single FRED series."""
        if not self.api_key:
            raise ValueError("FRED API key required. Set FRED_API_KEY env var.")

        params = {
            "series_id": series_id,
            "api_key": self.api_key,
            "file_type": "json",
            "observation_start": start_date,
            "observation_end": end_date,
        }

        response = self.client.get(self.BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("observations", [])

    def fetch_all(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        months: int = 24
    ) -> Dict[str, List[Dict]]:
        """
        Fetch all required FRED series.

        Args:
            start_date: Start date (YYYY-MM-DD), defaults to months ago
            end_date: End date (YYYY-MM-DD), defaults to today
            months: Months of history if dates not specified

        Returns:
            Dict mapping series_id to list of observations
        """
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start = datetime.now() - timedelta(days=months * 30)
            start_date = start.strftime("%Y-%m-%d")

        results = {}
        for series_id in self.SERIES.keys():
            try:
                results[series_id] = self.fetch_series(series_id, start_date, end_date)
                print(f"[FRED] Fetched {series_id}: {len(results[series_id])} observations")
            except Exception as e:
                print(f"[FRED] Error fetching {series_id}: {e}")
                results[series_id] = []

        self._cache = results
        return results

    def close(self):
        """Close the HTTP client."""
        self.client.close()


class NIVComputer:
    """Computes NIV (Net Investment Vigor) from FRED economic data."""

    # NIV Formula constants
    ETA = 1.5        # Friction exponent
    EPSILON = 0.001  # Safety floor
    RD_MULT = 1.15   # R&D/Education proxy multiplier

    def __init__(self):
        self._prev_values: Dict[str, float] = {}
        self._history: List[float] = []  # For volatility calculation

    def _safe_float(self, value: Any, default: float = 0.0) -> float:
        """Safely convert to float."""
        if value is None or value == "." or value == "":
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def _compute_yoy_change(self, current: List[Dict], field: str = "value") -> float:
        """Compute year-over-year change from observations."""
        if len(current) < 13:
            return 0.0
        try:
            now = self._safe_float(current[-1].get(field))
            year_ago = self._safe_float(current[-13].get(field))
            if year_ago == 0:
                return 0.0
            return ((now - year_ago) / abs(year_ago)) * 100
        except (IndexError, KeyError):
            return 0.0

    def _compute_mom_change(self, current: List[Dict], field: str = "value") -> float:
        """Compute month-over-month change."""
        if len(current) < 2:
            return 0.0
        try:
            now = self._safe_float(current[-1].get(field))
            prev = self._safe_float(current[-2].get(field))
            return now - prev
        except (IndexError, KeyError):
            return 0.0

    def _compute_volatility(self, series: List[Dict], window: int = 12) -> float:
        """Compute rolling standard deviation."""
        if len(series) < window:
            return 0.0
        values = [self._safe_float(obs.get("value")) for obs in series[-window:]]
        if not values:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        return math.sqrt(variance)

    def compute_from_fred(self, fred_data: Dict[str, List[Dict]]) -> List[NIVDataPoint]:
        """
        Compute NIV data points from FRED observations.

        Args:
            fred_data: Dict mapping series_id to observations

        Returns:
            List of NIVDataPoint objects
        """
        # Get the series with data
        investment = fred_data.get("GPDIC1", [])
        m2 = fred_data.get("M2SL", [])
        fed_funds = fred_data.get("FEDFUNDS", [])
        gdp = fred_data.get("GDPC1", [])
        capacity = fred_data.get("TCU", [])
        spread = fred_data.get("T10Y3M", [])
        cpi = fred_data.get("CPIAUCSL", [])

        if not all([investment, m2, fed_funds, gdp, capacity]):
            print("[NIV] Insufficient data for NIV computation")
            return []

        # Build monthly data points from the last 24 months
        results = []
        min_len = min(len(investment), len(m2), len(fed_funds), len(gdp), len(capacity))

        # Process last 12-24 months of data
        start_idx = max(0, min_len - 24)

        for i in range(start_idx, min_len):
            try:
                # Extract values
                inv_val = self._safe_float(investment[i].get("value"), 3000)
                m2_val = self._safe_float(m2[min(i, len(m2)-1)].get("value"), 15000)
                ff_val = self._safe_float(fed_funds[min(i, len(fed_funds)-1)].get("value"), 2.5)
                gdp_val = self._safe_float(gdp[i].get("value"), 20000)
                cap_val = self._safe_float(capacity[min(i, len(capacity)-1)].get("value"), 77)
                spread_val = self._safe_float(spread[min(i, len(spread)-1)].get("value") if spread else "0", 0)

                # Compute CPI inflation (YoY)
                cpi_inflation = 0.0
                if cpi and len(cpi) > i and i >= 12:
                    cpi_now = self._safe_float(cpi[i].get("value"))
                    cpi_ago = self._safe_float(cpi[i-12].get("value"))
                    if cpi_ago > 0:
                        cpi_inflation = ((cpi_now - cpi_ago) / cpi_ago) * 100

                # Create economic data
                date = investment[i].get("date", "")
                eco = EconomicData(
                    date=date,
                    investment=inv_val,
                    m2_supply=m2_val,
                    fed_funds_rate=ff_val,
                    gdp=gdp_val,
                    capacity_util=cap_val,
                    yield_spread=spread_val,
                    cpi_inflation=cpi_inflation
                )

                # Compute growth rates
                dG = self._compute_yoy_change(investment[:i+1]) if i > 12 else 0
                dA = self._compute_yoy_change(m2[:min(i+1, len(m2))]) if i > 12 else 0
                dr = self._compute_mom_change(fed_funds[:min(i+1, len(fed_funds))])
                sigma_r = self._compute_volatility(fed_funds[:min(i+1, len(fed_funds))])

                # Compute NIV components
                # Thrust: u = tanh(1.0*dG + 1.0*dA - 0.7*dr)
                thrust = math.tanh((1.0 * dG/100 + 1.0 * dA/100 - 0.7 * dr/10))

                # Efficiency: P = (Investment * 1.15) / GDP
                efficiency = (inv_val * self.RD_MULT) / (gdp_val + self.EPSILON)
                efficiency_squared = efficiency ** 2

                # Slack: X = 1 - (TCU/100)
                slack = 1 - (cap_val / 100)

                # Drag components
                drag_spread = abs(spread_val) / 100 if spread_val < 0 else 0
                drag_real_rate = max(0, (ff_val - cpi_inflation) / 100)
                drag_volatility = sigma_r / 100

                # Combined drag: F = 0.4*spread + 0.4*real_rate + 0.2*volatility
                drag = 0.4 * drag_spread + 0.4 * drag_real_rate + 0.2 * drag_volatility

                comp = NIVComponents(
                    thrust=thrust,
                    efficiency=efficiency,
                    efficiency_squared=efficiency_squared,
                    slack=slack,
                    drag=drag,
                    drag_spread=drag_spread,
                    drag_real_rate=drag_real_rate,
                    drag_volatility=drag_volatility
                )

                # Master NIV formula: NIV = (u × P²) / (X + F)^η × 1000
                denominator = (slack + drag + self.EPSILON) ** self.ETA
                niv_score = (thrust * efficiency_squared) / denominator * 1000

                # Recession probability: sigmoid transformation
                recession_prob = 1 / (1 + math.exp(niv_score / 10))

                datapoint = NIVDataPoint(
                    date=date,
                    economic=eco,
                    components=comp,
                    niv_score=niv_score,
                    recession_probability=recession_prob,
                    dG=dG,
                    dA=dA,
                    dr=dr,
                    sigma_r=sigma_r
                )
                results.append(datapoint)

            except Exception as e:
                print(f"[NIV] Error at index {i}: {e}")
                continue

        return results


class UFEHook:
    """
    Background sync hook for UFE integration.

    Fetches real FRED data, computes NIV, and pushes to UFE
    for latent space analysis and energy computation.
    """

    def __init__(self, interval: int = 60, api_key: Optional[str] = None):
        """
        Initialize the UFE hook.

        Args:
            interval: Sync interval in seconds
            api_key: FRED API key (falls back to FRED_API_KEY env var)
        """
        self.interval = interval
        self.ufe = UFEIntegration()
        self.fred = FREDFetcher(api_key)
        self.niv = NIVComputer()
        self.running = False
        self._thread: Optional[threading.Thread] = None
        self._last_result: Optional[Dict] = None

    def _fetch_real_data(self) -> List[NIVDataPoint]:
        """
        Fetch real FRED data and compute NIV.

        Returns:
            List of NIVDataPoint objects from real economic data
        """
        # Fetch last 24 months of FRED data
        fred_data = self.fred.fetch_all(months=24)

        # Compute NIV from FRED data
        datapoints = self.niv.compute_from_fred(fred_data)

        print(f"[UFE] Computed {len(datapoints)} NIV data points from FRED")
        return datapoints

    def push(self) -> Optional[Dict]:
        """
        Push current data to UFE and return analysis results.

        Returns:
            UFE analysis results or None on error
        """
        try:
            states = self._fetch_real_data()
            if not states:
                print("[UFE] No data available")
                return None

            result = self.ufe.analyze(states)
            self._last_result = result

            energy = result.get('energy', {})
            friction = result.get('friction', {})

            print(f"[UFE] Energy: {energy.get('total_energy', 0):.4f}")
            print(f"[UFE] Trajectory Dev: {energy.get('trajectory_deviation', 0):.4f}")
            print(f"[UFE] Friction: drag={friction.get('drag', 0):.3f}, collapse_prob={friction.get('collapse_prob', 0):.3f}")

            # Show latest NIV status
            if states:
                latest = states[-1]
                print(f"[UFE] Latest NIV: {latest.niv_score:.2f} (P(rec)={latest.recession_probability:.2f})")

            return result

        except ValueError as e:
            print(f"[UFE] Config error: {e}")
            return None
        except Exception as e:
            print(f"[UFE] Error: {type(e).__name__}: {e}")
            return None

    def start(self):
        """Start background sync thread."""
        if self.running:
            print("[UFE] Already running")
            return

        self.running = True

        def loop():
            while self.running:
                self.push()
                time.sleep(self.interval)

        self._thread = threading.Thread(target=loop, daemon=True)
        self._thread.start()
        print(f"[UFE] Background sync started (interval={self.interval}s)")

    def stop(self):
        """Stop background sync."""
        self.running = False
        print("[UFE] Background sync stopped")

    def get_last_result(self) -> Optional[Dict]:
        """Get the last analysis result."""
        return self._last_result

    def close(self):
        """Clean up resources."""
        self.stop()
        self.fred.close()
        self.ufe.close()


# Global hook instance
hook = UFEHook(interval=60)


def compute_local_energy(datapoints: List[NIVDataPoint]) -> Dict[str, Any]:
    """Compute energy metrics locally when UFE API is unavailable."""
    if not datapoints:
        return {'total_energy': 0, 'trajectory_deviation': 0, 'undercurrent_friction': 0}

    # Compute local energy proxy from NIV data
    total_niv_var = sum((dp.niv_score - 10) ** 2 for dp in datapoints) / len(datapoints)
    avg_prob = sum(dp.recession_probability for dp in datapoints) / len(datapoints)
    avg_drag = sum(dp.components.drag for dp in datapoints) / len(datapoints)

    # Normalize to 0-1 range
    local_energy = min(1.0, (total_niv_var / 1000 + avg_prob + avg_drag) / 3)
    traj_deviation = min(1.0, total_niv_var / 500)

    return {
        'total_energy': local_energy,
        'trajectory_deviation': traj_deviation,
        'undercurrent_friction': avg_drag,
        'self_prediction_error': abs(datapoints[-1].niv_score - datapoints[-2].niv_score) / 50 if len(datapoints) > 1 else 0,
        'friction_breakdown': {
            'drag': avg_drag,
            'collapse_prob': avg_prob
        }
    }


def main():
    """Test the UFE hook with real FRED data."""
    print("=" * 60)
    print("UFE HOOK - Real FRED Data Integration Test")
    print("=" * 60)

    # Check for API key
    api_key = os.environ.get("FRED_API_KEY")
    if not api_key:
        print("\nNo FRED_API_KEY found. Running with sample NIV data.")
        print("Set FRED_API_KEY environment variable for real FRED data.")
        print("Get free key at: https://fred.stlouisfed.org/docs/api/api_key.html")

    # Load data (sample if no API key)
    from ufe_integration import create_sample_niv_data
    print("\n--- Loading NIV Data ---")

    if api_key:
        print(f"FRED API Key: {api_key[:8]}...{api_key[-4:]}")
        fred = FREDFetcher(api_key)
        niv = NIVComputer()
        try:
            fred_data = fred.fetch_all(months=24)
            sample_data = niv.compute_from_fred(fred_data)
            print(f"Fetched {len(sample_data)} data points from FRED")
        except Exception as e:
            print(f"FRED fetch failed: {e}")
            print("Falling back to sample data")
            sample_data = create_sample_niv_data()
        fred.close()
    else:
        sample_data = create_sample_niv_data()
        print(f"Using {len(sample_data)} sample data points")

    # Show recent data
    print("\n--- Recent NIV Data Points ---")
    for dp in sample_data[-5:]:
        status = "CRISIS" if dp.recession_probability > 0.7 else "WARN" if dp.recession_probability > 0.5 else "OK"
        print(f"  {dp.date[:10]}: NIV={dp.niv_score:+7.2f}  P(rec)={dp.recession_probability:.2f}  [{status}]")
        print(f"             thrust={dp.components.thrust:.3f}  drag={dp.components.drag:.3f}  slack={dp.components.slack:.3f}")

    # Try UFE API, fall back to local computation
    print("\n--- UFE Analysis ---")
    ufe = UFEIntegration()

    try:
        # Test API health first
        health = ufe.client.health()
        print(f"UFE API: {health.get('status', 'unknown')}")

        # Run full analysis
        result = ufe.analyze(sample_data)
        energy = result['energy']
        friction = result['friction']

    except Exception as e:
        print(f"UFE API unavailable ({type(e).__name__}), using local analysis")
        energy = compute_local_energy(sample_data)
        friction = energy.get('friction_breakdown', {})

    # Display results
    print(f"\nTotal Energy:          {energy.get('total_energy', 0):.4f}")
    print(f"Trajectory Deviation:  {energy.get('trajectory_deviation', 0):.4f}")
    print(f"Undercurrent Friction: {energy.get('undercurrent_friction', 0):.4f}")
    print(f"Self-Prediction Error: {energy.get('self_prediction_error', 0):.4f}")

    print(f"\nFriction Breakdown:")
    print(f"  drag:          {friction.get('drag', 0):.4f}")
    print(f"  collapse_prob: {friction.get('collapse_prob', 0):.4f}")

    # Interpret
    print("\n--- Interpretation ---")
    e = energy.get('total_energy', 0)
    if e < 0.3:
        print("[OK] System STABLE - low energy state")
    elif e < 0.5:
        print("[~~] System TRANSITIONING - moderate energy")
    elif e < 0.7:
        print("[!!] System ELEVATED - friction building")
    else:
        print("[XX] System UNSTABLE - expect major changes")

    # Latest NIV interpretation
    if sample_data:
        latest = sample_data[-1]
        if latest.recession_probability > 0.7:
            print(f"[!!] HIGH RECESSION RISK: {latest.recession_probability:.0%}")
        elif latest.recession_probability > 0.5:
            print(f"[~~] Elevated recession risk: {latest.recession_probability:.0%}")
        else:
            print(f"[OK] Recession risk normal: {latest.recession_probability:.0%}")

    ufe.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
