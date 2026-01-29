"""
UFE Integration for Regenerationism

Maps NIV (Net Investment Vigor) economic data to UFE's 64-dimensional
macro feature vector for latent space analysis.

Feature vector structure (64 dimensions):
- [0-6]   Raw economic indicators (normalized)
- [7-10]  Growth rates
- [11-18] NIV components
- [19-23] Derived metrics
- [24-31] Ratios and cross-terms
- [32-47] Lagged values (t-1, t-3, t-6, t-12)
- [48-55] Momentum indicators
- [56-63] Risk/stress indicators
"""

import math
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from ufe_client import UFEClient


@dataclass
class EconomicData:
    """Raw economic data from FRED."""
    date: str
    investment: float      # GPDIC1 - Real Gross Private Domestic Investment (Billions)
    m2_supply: float       # M2SL - M2 Money Stock (Billions)
    fed_funds_rate: float  # FEDFUNDS - Federal Funds Effective Rate (%)
    gdp: float             # GDPC1 - Real GDP (Billions)
    capacity_util: float   # TCU - Total Capacity Utilization (%)
    yield_spread: float    # T10Y3M - 10Y-3M Treasury Spread (%)
    cpi_inflation: float   # CPIAUCSL YoY change (%)


@dataclass
class NIVComponents:
    """Computed NIV components."""
    thrust: float           # u = tanh(1.0*dG + 1.0*dA - 0.7*dr)
    efficiency: float       # P = (Investment * 1.15) / GDP
    efficiency_squared: float  # P^2
    slack: float            # X = 1 - (TCU/100)
    drag: float             # F = 0.4*spread + 0.4*real_rate + 0.2*volatility
    drag_spread: float      # Yield curve inversion penalty
    drag_real_rate: float   # r - π (real interest rate)
    drag_volatility: float  # σ_r (Fed Funds volatility)


@dataclass
class NIVDataPoint:
    """Complete NIV data point for a single time period."""
    date: str
    economic: EconomicData
    components: NIVComponents
    niv_score: float
    recession_probability: float
    # Growth rates
    dG: float  # Monthly % change in Investment
    dA: float  # 12-month % change in M2
    dr: float  # Monthly change in Fed Funds Rate
    sigma_r: float  # 12-month rolling std dev of Fed Funds


class UFEIntegration:
    """
    Integration layer between Regenerationism NIV model and UFE API.

    Maps economic time series data to 64-dimensional feature vectors
    for latent space encoding and energy analysis.

    Domain: macro
    - Input dimensions: 64 features
    - Friction terms: drag, collapse_prob
    """

    DOMAIN = "macro"
    FEATURE_DIM = 64
    LATENT_DIM = 256

    # Normalization constants (approximate ranges from historical data)
    NORM = {
        'investment': (1000, 5000),      # Billions USD
        'm2_supply': (5000, 25000),      # Billions USD
        'fed_funds_rate': (0, 20),       # Percent
        'gdp': (10000, 25000),           # Billions USD
        'capacity_util': (60, 90),       # Percent
        'yield_spread': (-3, 4),         # Percent
        'cpi_inflation': (-2, 15),       # Percent
        'niv_score': (-50, 50),          # NIV range
        'probability': (0, 1),           # Recession probability
    }

    def __init__(self):
        self.client = UFEClient()
        self._history: List[NIVDataPoint] = []

    def _normalize(self, value: float, key: str) -> float:
        """Normalize a value to [0, 1] range based on historical bounds."""
        if key in self.NORM:
            lo, hi = self.NORM[key]
            return max(0, min(1, (value - lo) / (hi - lo + 1e-8)))
        return value

    def _safe_value(self, value: Optional[float], default: float = 0.0) -> float:
        """Safely handle None or NaN values."""
        if value is None or math.isnan(value) or math.isinf(value):
            return default
        return value

    def to_features(self, datapoint: NIVDataPoint) -> List[float]:
        """
        Convert a NIVDataPoint to a 64-dimensional UFE feature vector.

        Args:
            datapoint: NIVDataPoint with economic data and NIV components

        Returns:
            List of 64 floats representing the feature vector
        """
        features = [0.0] * self.FEATURE_DIM
        eco = datapoint.economic
        comp = datapoint.components

        # [0-6] Raw economic indicators (normalized)
        features[0] = self._normalize(eco.investment, 'investment')
        features[1] = self._normalize(eco.m2_supply, 'm2_supply')
        features[2] = self._normalize(eco.fed_funds_rate, 'fed_funds_rate')
        features[3] = self._normalize(eco.gdp, 'gdp')
        features[4] = self._normalize(eco.capacity_util, 'capacity_util')
        features[5] = self._normalize(eco.yield_spread, 'yield_spread')
        features[6] = self._normalize(eco.cpi_inflation, 'cpi_inflation')

        # [7-10] Growth rates (already in decimal/percent form)
        features[7] = self._safe_value(datapoint.dG) / 100  # Scale to ~[-1, 1]
        features[8] = self._safe_value(datapoint.dA) / 100
        features[9] = self._safe_value(datapoint.dr) / 10
        features[10] = self._safe_value(datapoint.sigma_r) / 5

        # [11-18] NIV components
        features[11] = self._safe_value(comp.thrust)  # Already in [-1, 1] via tanh
        features[12] = self._safe_value(comp.efficiency) * 5  # Scale ~0.17 to ~0.85
        features[13] = self._safe_value(comp.efficiency_squared) * 25  # Scale P^2
        features[14] = self._safe_value(comp.slack)  # Already in [0, 1]
        features[15] = self._safe_value(comp.drag)  # Combined friction
        features[16] = self._safe_value(comp.drag_spread) * 2  # Yield penalty
        features[17] = self._safe_value(comp.drag_real_rate) / 10  # Real rate
        features[18] = self._safe_value(comp.drag_volatility) / 5  # Volatility

        # [19-23] Derived metrics
        features[19] = self._normalize(datapoint.niv_score, 'niv_score')
        features[20] = self._safe_value(datapoint.recession_probability)
        features[21] = max(0, eco.fed_funds_rate - eco.cpi_inflation) / 10  # Real rate
        features[22] = abs(eco.yield_spread) / 5 if eco.yield_spread < 0 else 0  # Inversion
        features[23] = self._safe_value(datapoint.sigma_r) / 3  # Vol indicator

        # [24-31] Ratios and cross-terms
        features[24] = eco.investment / (eco.gdp + 1e-8)  # Investment/GDP ratio
        features[25] = eco.m2_supply / (eco.gdp + 1e-8) / 1.5  # M2/GDP ratio
        features[26] = eco.investment / (eco.m2_supply + 1e-8) * 5  # Investment/M2
        features[27] = comp.thrust * comp.efficiency  # Thrust-efficiency interaction
        features[28] = comp.slack * comp.drag  # Slack-drag interaction
        features[29] = (comp.thrust * comp.efficiency_squared) / (comp.slack + comp.drag + 0.001)  # NIV proxy
        features[30] = eco.capacity_util / 100 * comp.efficiency  # Capacity-efficiency
        features[31] = comp.drag_spread * comp.drag_real_rate  # Drag interaction

        # [32-47] Lagged values (use history if available)
        # These capture temporal dynamics - filled with current values if no history
        lag_indices = [1, 3, 6, 12]  # t-1, t-3, t-6, t-12
        base_idx = 32
        for i, lag in enumerate(lag_indices):
            if len(self._history) > lag:
                hist = self._history[-lag]
                features[base_idx + i*4 + 0] = self._normalize(hist.niv_score, 'niv_score')
                features[base_idx + i*4 + 1] = self._safe_value(hist.components.thrust)
                features[base_idx + i*4 + 2] = self._safe_value(hist.components.drag)
                features[base_idx + i*4 + 3] = self._safe_value(hist.recession_probability)
            else:
                # Use current values as fallback
                features[base_idx + i*4 + 0] = features[19]
                features[base_idx + i*4 + 1] = features[11]
                features[base_idx + i*4 + 2] = features[15]
                features[base_idx + i*4 + 3] = features[20]

        # [48-55] Momentum indicators
        if len(self._history) >= 3:
            hist = self._history[-3:]
            niv_values = [h.niv_score for h in hist] + [datapoint.niv_score]
            thrust_values = [h.components.thrust for h in hist] + [comp.thrust]

            # NIV momentum (change over 3 periods)
            features[48] = (niv_values[-1] - niv_values[0]) / (abs(niv_values[0]) + 1) / 3
            # Thrust acceleration
            features[49] = (thrust_values[-1] - thrust_values[-2]) - (thrust_values[-2] - thrust_values[-3])
            # Trend strength (positive if consistent direction)
            features[50] = sum(1 if niv_values[i+1] > niv_values[i] else -1 for i in range(3)) / 3
        else:
            features[48] = 0.0
            features[49] = 0.0
            features[50] = 0.0

        # Drag momentum
        if len(self._history) >= 3:
            drag_values = [h.components.drag for h in self._history[-3:]] + [comp.drag]
            features[51] = (drag_values[-1] - drag_values[0]) / 3
        else:
            features[51] = 0.0

        # Efficiency trend
        features[52] = comp.efficiency - 0.17  # Deviation from historical average
        # Slack trend (positive = improving capacity)
        features[53] = comp.slack - 0.2  # Deviation from typical slack
        # Recession probability change
        if len(self._history) >= 1:
            features[54] = datapoint.recession_probability - self._history[-1].recession_probability
        else:
            features[54] = 0.0
        # Yield curve momentum
        if len(self._history) >= 1:
            features[55] = eco.yield_spread - self._history[-1].economic.yield_spread
        else:
            features[55] = 0.0

        # [56-63] Risk/stress indicators
        # Yield curve inversion depth
        features[56] = max(0, -eco.yield_spread) / 3
        # High real rate stress
        features[57] = max(0, (eco.fed_funds_rate - eco.cpi_inflation - 2)) / 5
        # Capacity stress (too high = overheating)
        features[58] = max(0, eco.capacity_util - 80) / 10
        # NIV crisis signal (very negative NIV)
        features[59] = max(0, -datapoint.niv_score) / 30
        # Combined stress index
        features[60] = (features[56] + features[57] + features[58] + features[59]) / 4
        # Drag explosion warning
        features[61] = 1.0 if comp.drag > 0.5 else comp.drag * 2
        # Thrust collapse warning
        features[62] = 1.0 if comp.thrust < -0.5 else max(0, -comp.thrust * 2)
        # Overall crisis probability (elevated recession + high drag)
        features[63] = min(1.0, datapoint.recession_probability * (1 + comp.drag))

        return features

    def to_features_from_dict(self, data: Dict[str, Any]) -> List[float]:
        """
        Convert a dictionary (from API/JSON) to a 64-dimensional feature vector.

        Supports both raw API format and structured NIVDataPoint-like dicts.
        """
        # Extract or default values
        eco = EconomicData(
            date=data.get('date', ''),
            investment=data.get('investment', data.get('GPDIC1', 3000)),
            m2_supply=data.get('m2_supply', data.get('M2SL', 15000)),
            fed_funds_rate=data.get('fed_funds_rate', data.get('FEDFUNDS', 2.5)),
            gdp=data.get('gdp', data.get('GDPC1', 20000)),
            capacity_util=data.get('capacity_util', data.get('TCU', 77)),
            yield_spread=data.get('yield_spread', data.get('T10Y3M', 1.0)),
            cpi_inflation=data.get('cpi_inflation', data.get('CPIAUCSL', 2.5)),
        )

        comp_data = data.get('components', data)
        comp = NIVComponents(
            thrust=comp_data.get('thrust', 0.0),
            efficiency=comp_data.get('efficiency', 0.17),
            efficiency_squared=comp_data.get('efficiencySquared', comp_data.get('efficiency_squared', 0.03)),
            slack=comp_data.get('slack', 0.23),
            drag=comp_data.get('drag', 0.1),
            drag_spread=comp_data.get('dragSpread', comp_data.get('drag_spread', 0.0)),
            drag_real_rate=comp_data.get('dragRealRate', comp_data.get('drag_real_rate', 0.0)),
            drag_volatility=comp_data.get('dragVolatility', comp_data.get('drag_volatility', 0.0)),
        )

        datapoint = NIVDataPoint(
            date=eco.date,
            economic=eco,
            components=comp,
            niv_score=data.get('niv', data.get('niv_score', 0.0)),
            recession_probability=data.get('probability', data.get('recession_probability', 0.5)),
            dG=data.get('dG', comp_data.get('dG', 0.0)),
            dA=data.get('dA', comp_data.get('dA', 0.0)),
            dr=data.get('dr', comp_data.get('dr', 0.0)),
            sigma_r=data.get('sigma_r', comp_data.get('volatility', 0.0)),
        )

        return self.to_features(datapoint)

    def add_to_history(self, datapoint: NIVDataPoint):
        """Add a datapoint to history for temporal feature computation."""
        self._history.append(datapoint)
        # Keep last 24 months
        if len(self._history) > 24:
            self._history = self._history[-24:]

    def clear_history(self):
        """Clear the historical data."""
        self._history = []

    def analyze(self, datapoints: List[NIVDataPoint]) -> Dict[str, Any]:
        """
        Analyze a sequence of NIV data points through UFE.

        Args:
            datapoints: List of NIVDataPoint objects (time series)

        Returns:
            Dict with energy analysis, latent encoding, and predictions
        """
        # Clear and rebuild history
        self.clear_history()

        # Build trajectory (add each point to history for temporal features)
        trajectory_features = []
        for dp in datapoints:
            features = self.to_features(dp)
            trajectory_features.append(features)
            self.add_to_history(dp)

        # Wrap in batch dimension [1, timesteps, 64]
        trajectory = [trajectory_features]

        # Call UFE API
        energy = self.client.energy(trajectory, self.DOMAIN)
        encoded = self.client.encode(trajectory, self.DOMAIN)

        # Get last latent state for prediction
        latent = encoded.get("latent", [[]])
        if latent and latent[0]:
            last_latent = [latent[0][-1]] if isinstance(latent[0][0], list) else [latent[0]]
            prediction = self.client.predict(last_latent, num_steps=10)
        else:
            prediction = {"trajectory": [], "shape": [0, 0, 0]}

        return {
            "energy": energy,
            "encoded": encoded,
            "prediction": prediction,
            "friction": energy.get("friction_breakdown", {}),
            "trajectory_shape": [1, len(trajectory_features), self.FEATURE_DIM],
        }

    def analyze_dicts(self, data_dicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze a sequence of data dictionaries through UFE.

        Convenience method for working with JSON/API data.
        """
        # Convert dicts to feature vectors directly
        trajectory = [[self.to_features_from_dict(d) for d in data_dicts]]

        energy = self.client.energy(trajectory, self.DOMAIN)
        encoded = self.client.encode(trajectory, self.DOMAIN)

        latent = encoded.get("latent", [[]])
        if latent and latent[0]:
            last_latent = [latent[0][-1]] if isinstance(latent[0][0], list) else [latent[0]]
            prediction = self.client.predict(last_latent, num_steps=10)
        else:
            prediction = {"trajectory": [], "shape": [0, 0, 0]}

        return {
            "energy": energy,
            "encoded": encoded,
            "prediction": prediction,
            "friction": energy.get("friction_breakdown", {}),
            "trajectory_shape": [1, len(data_dicts), self.FEATURE_DIM],
        }

    def close(self):
        """Close the UFE client."""
        self.client.close()


def create_sample_niv_data() -> List[NIVDataPoint]:
    """
    Create sample NIV data representing key economic periods.

    Returns realistic data for:
    - 2006-2007: Pre-crisis buildup
    - 2007-2008: Financial crisis
    - 2019-2020: Pre-COVID and crash
    - 2021-2022: Recovery and inflation
    """
    samples = [
        # 2006 Q4 - Pre-crisis, strong growth
        NIVDataPoint(
            date="2006-10-01",
            economic=EconomicData(
                date="2006-10-01",
                investment=2800, m2_supply=7100, fed_funds_rate=5.25,
                gdp=14800, capacity_util=81.2, yield_spread=0.02, cpi_inflation=2.1
            ),
            components=NIVComponents(
                thrust=0.35, efficiency=0.218, efficiency_squared=0.048,
                slack=0.188, drag=0.15, drag_spread=0.0, drag_real_rate=0.03, drag_volatility=0.02
            ),
            niv_score=18.5, recession_probability=0.25,
            dG=4.2, dA=5.1, dr=0.0, sigma_r=0.15
        ),
        # 2007 Q3 - Crisis warning signs
        NIVDataPoint(
            date="2007-07-01",
            economic=EconomicData(
                date="2007-07-01",
                investment=2750, m2_supply=7350, fed_funds_rate=5.25,
                gdp=15000, capacity_util=80.5, yield_spread=-0.15, cpi_inflation=2.7
            ),
            components=NIVComponents(
                thrust=0.08, efficiency=0.211, efficiency_squared=0.045,
                slack=0.195, drag=0.28, drag_spread=0.15, drag_real_rate=0.026, drag_volatility=0.04
            ),
            niv_score=5.2, recession_probability=0.48,
            dG=-1.8, dA=3.5, dr=0.0, sigma_r=0.22
        ),
        # 2008 Q4 - Full crisis
        NIVDataPoint(
            date="2008-10-01",
            economic=EconomicData(
                date="2008-10-01",
                investment=2200, m2_supply=7900, fed_funds_rate=1.0,
                gdp=14400, capacity_util=73.5, yield_spread=2.5, cpi_inflation=3.7
            ),
            components=NIVComponents(
                thrust=-0.65, efficiency=0.176, efficiency_squared=0.031,
                slack=0.265, drag=0.12, drag_spread=0.0, drag_real_rate=0.0, drag_volatility=0.12
            ),
            niv_score=-28.5, recession_probability=0.92,
            dG=-21.5, dA=8.2, dr=-1.5, sigma_r=0.85
        ),
        # 2019 Q4 - Pre-COVID stability
        NIVDataPoint(
            date="2019-10-01",
            economic=EconomicData(
                date="2019-10-01",
                investment=3650, m2_supply=15200, fed_funds_rate=1.75,
                gdp=19200, capacity_util=77.2, yield_spread=-0.05, cpi_inflation=1.8
            ),
            components=NIVComponents(
                thrust=0.18, efficiency=0.219, efficiency_squared=0.048,
                slack=0.228, drag=0.18, drag_spread=0.05, drag_real_rate=0.0, drag_volatility=0.03
            ),
            niv_score=12.8, recession_probability=0.38,
            dG=2.1, dA=6.8, dr=-0.25, sigma_r=0.18
        ),
        # 2020 Q2 - COVID crash
        NIVDataPoint(
            date="2020-04-01",
            economic=EconomicData(
                date="2020-04-01",
                investment=2900, m2_supply=17800, fed_funds_rate=0.05,
                gdp=17500, capacity_util=64.2, yield_spread=0.45, cpi_inflation=0.3
            ),
            components=NIVComponents(
                thrust=-0.72, efficiency=0.191, efficiency_squared=0.036,
                slack=0.358, drag=0.08, drag_spread=0.0, drag_real_rate=0.0, drag_volatility=0.08
            ),
            niv_score=-35.2, recession_probability=0.95,
            dG=-20.5, dA=17.5, dr=-1.7, sigma_r=0.62
        ),
        # 2021 Q4 - Recovery + inflation buildup
        NIVDataPoint(
            date="2021-10-01",
            economic=EconomicData(
                date="2021-10-01",
                investment=3850, m2_supply=21200, fed_funds_rate=0.08,
                gdp=19800, capacity_util=77.8, yield_spread=1.45, cpi_inflation=6.2
            ),
            components=NIVComponents(
                thrust=0.58, efficiency=0.224, efficiency_squared=0.050,
                slack=0.222, drag=0.05, drag_spread=0.0, drag_real_rate=0.0, drag_volatility=0.01
            ),
            niv_score=42.5, recession_probability=0.12,
            dG=32.8, dA=12.5, dr=0.0, sigma_r=0.05
        ),
        # 2022 Q4 - Rate hike stress
        NIVDataPoint(
            date="2022-10-01",
            economic=EconomicData(
                date="2022-10-01",
                investment=3950, m2_supply=21400, fed_funds_rate=3.25,
                gdp=20200, capacity_util=79.5, yield_spread=-0.35, cpi_inflation=7.7
            ),
            components=NIVComponents(
                thrust=-0.12, efficiency=0.225, efficiency_squared=0.051,
                slack=0.205, drag=0.32, drag_spread=0.35, drag_real_rate=0.0, drag_volatility=0.12
            ),
            niv_score=-2.8, recession_probability=0.55,
            dG=2.6, dA=0.8, dr=0.75, sigma_r=0.95
        ),
        # 2023 Q2 - Elevated rates
        NIVDataPoint(
            date="2023-04-01",
            economic=EconomicData(
                date="2023-04-01",
                investment=4050, m2_supply=20800, fed_funds_rate=4.75,
                gdp=20500, capacity_util=79.2, yield_spread=-1.2, cpi_inflation=4.9
            ),
            components=NIVComponents(
                thrust=-0.28, efficiency=0.227, efficiency_squared=0.052,
                slack=0.208, drag=0.45, drag_spread=1.2, drag_real_rate=0.0, drag_volatility=0.15
            ),
            niv_score=-8.5, recession_probability=0.62,
            dG=2.5, dA=-2.9, dr=0.25, sigma_r=1.05
        ),
    ]
    return samples
