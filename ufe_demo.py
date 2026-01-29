#!/usr/bin/env python3
"""
UFE Demo for Regenerationism

Live demonstration of the Undercurrent Flux Engine integration with
the NIV (Net Investment Vigor) macro-economic model.

Analyzes historical economic periods through UFE's latent space encoding
and energy computation to detect systemic friction and instability.
"""

import sys
from ufe_integration import UFEIntegration, create_sample_niv_data, NIVDataPoint


def print_header(title: str, char: str = "="):
    """Print a formatted header."""
    width = 70
    print(f"\n{char * width}")
    print(f" {title}")
    print(f"{char * width}")


def print_subheader(title: str):
    """Print a formatted subheader."""
    print(f"\n--- {title} ---")


def format_period(datapoints: list) -> str:
    """Format the time period covered by datapoints."""
    if not datapoints:
        return "N/A"
    start = datapoints[0].date[:7]
    end = datapoints[-1].date[:7]
    return f"{start} to {end}"


def interpret_energy(energy: float) -> tuple:
    """Interpret energy level and return (symbol, description)."""
    if energy < 0.3:
        return ("OK", "STABLE - Low energy state, system in equilibrium")
    elif energy < 0.5:
        return ("~~", "TRANSITIONING - Moderate energy, watch for shifts")
    elif energy < 0.7:
        return ("!!", "ELEVATED - High energy, friction building")
    else:
        return ("XX", "UNSTABLE - Critical energy, expect major changes")


def interpret_friction(friction_breakdown: dict) -> list:
    """Interpret friction terms for macro domain."""
    interpretations = []

    drag = friction_breakdown.get('drag', 0)
    collapse_prob = friction_breakdown.get('collapse_prob', 0)

    if drag > 0.5:
        interpretations.append(f"  ! HIGH DRAG ({drag:.3f}): Severe economic friction - yield curve, rates, or volatility stress")
    elif drag > 0.3:
        interpretations.append(f"  ~ Elevated drag ({drag:.3f}): Moderate headwinds from financial conditions")
    else:
        interpretations.append(f"  . Normal drag ({drag:.3f}): Financial conditions supportive")

    if collapse_prob > 0.5:
        interpretations.append(f"  ! HIGH COLLAPSE PROB ({collapse_prob:.3f}): System at risk of rapid state change")
    elif collapse_prob > 0.3:
        interpretations.append(f"  ~ Elevated collapse risk ({collapse_prob:.3f}): Potential instability detected")
    else:
        interpretations.append(f"  . Normal collapse prob ({collapse_prob:.3f}): System appears resilient")

    return interpretations


def main():
    """Run the UFE integration demo."""
    print_header("UNDERCURRENT FLUX ENGINE (UFE) DEMO", "=")
    print("Macro-Economic World Modeling via Regenerationism NIV Integration")
    print("Domain: macro | Features: 64 | Latent: 256 | Friction: drag, collapse_prob")

    # Initialize integration
    ufe = UFEIntegration()
    api_available = False

    # Test API connection
    print_header("1. UFE API CONNECTION TEST")
    try:
        health = ufe.client.health()
        print(f"  Status:      {health.get('status', 'unknown')}")
        print(f"  Latent Dim:  {health.get('latent_dim', 'N/A')}")
        print(f"  Domains:     {', '.join(health.get('domains', []))}")
        print("\n  Connection successful!")
        api_available = True
    except Exception as e:
        print(f"  NOTE: API not reachable ({type(e).__name__})")
        print("  Running in LOCAL DEMO MODE - showing feature mapping and local analysis")

    # Load sample NIV data
    print_header("2. LOADING HISTORICAL NIV DATA")
    datapoints = create_sample_niv_data()
    print(f"  Loaded {len(datapoints)} economic snapshots")
    print(f"  Period: {format_period(datapoints)}")
    print_subheader("Data Points Summary")
    for dp in datapoints:
        status = "CRISIS" if dp.recession_probability > 0.7 else "WARNING" if dp.recession_probability > 0.5 else "NORMAL"
        print(f"  {dp.date[:7]}: NIV={dp.niv_score:+7.2f}  P(recession)={dp.recession_probability:.2f}  [{status}]")

    # Demonstrate feature mapping
    print_header("3. FEATURE VECTOR MAPPING")
    sample_dp = datapoints[2]  # 2008 crisis point
    features = ufe.to_features(sample_dp)
    print(f"  Sample: {sample_dp.date} (2008 Financial Crisis)")
    print(f"  NIV Score: {sample_dp.niv_score:.2f}")
    print(f"  Feature Vector: {len(features)} dimensions")
    print_subheader("Feature Groups (sample values)")
    print(f"  [0-6]   Raw Economic:  {[f'{f:.3f}' for f in features[0:7]]}")
    print(f"  [7-10]  Growth Rates:  {[f'{f:.3f}' for f in features[7:11]]}")
    print(f"  [11-18] NIV Components: {[f'{f:.3f}' for f in features[11:19]]}")
    print(f"  [19-23] Derived:       {[f'{f:.3f}' for f in features[19:24]]}")
    print(f"  [56-63] Risk Signals:  {[f'{f:.3f}' for f in features[56:64]]}")

    # Run full UFE analysis
    print_header("4. UFE ENERGY ANALYSIS")
    print(f"  Analyzing trajectory: {len(datapoints)} timesteps x 64 features")

    energy = {'total_energy': 0}
    friction = {}

    if api_available:
        try:
            result = ufe.analyze(datapoints)
            energy = result['energy']

            print_subheader("Energy Computation Results")
            print(f"  Total Energy:          {energy.get('total_energy', 0):.4f}")
            print(f"  Trajectory Deviation:  {energy.get('trajectory_deviation', 0):.4f}")
            print(f"  Undercurrent Friction: {energy.get('undercurrent_friction', 0):.4f}")
            print(f"  Self-Prediction Error: {energy.get('self_prediction_error', 0):.4f}")

            print_subheader("Friction Breakdown (Macro Domain)")
            friction = result['friction']
            for term, value in friction.items():
                if term != 'total':
                    bar = "#" * int(value * 20)
                    print(f"  {term:15s}: {value:.4f} |{bar}")

            print_subheader("Latent Space Encoding")
            encoded = result['encoded']
            print(f"  Input Shape:  {result['trajectory_shape']}")
            print(f"  Latent Shape: {encoded.get('shape', 'N/A')}")

            print_subheader("Trajectory Prediction (10 steps)")
            prediction = result['prediction']
            print(f"  Prediction Shape: {prediction.get('shape', 'N/A')}")

        except Exception as e:
            print(f"  API call failed: {type(e).__name__}")
            api_available = False

    if not api_available:
        # Local analysis using NIV metrics directly
        print_subheader("Local Energy Analysis (NIV-based)")

        # Build trajectory
        ufe.clear_history()
        trajectory = []
        for dp in datapoints:
            features = ufe.to_features(dp)
            trajectory.append(features)
            ufe.add_to_history(dp)

        # Compute local energy proxy from NIV data
        # Energy = instability indicator from NIV metrics
        total_niv_var = sum((dp.niv_score - 10) ** 2 for dp in datapoints) / len(datapoints)
        avg_prob = sum(dp.recession_probability for dp in datapoints) / len(datapoints)
        avg_drag = sum(dp.components.drag for dp in datapoints) / len(datapoints)

        # Normalize to 0-1 range
        local_energy = min(1.0, (total_niv_var / 1000 + avg_prob + avg_drag) / 3)
        traj_deviation = min(1.0, total_niv_var / 500)
        undercurrent_friction = avg_drag

        energy = {
            'total_energy': local_energy,
            'trajectory_deviation': traj_deviation,
            'undercurrent_friction': undercurrent_friction,
            'self_prediction_error': abs(datapoints[-1].niv_score - datapoints[-2].niv_score) / 50
        }
        friction = {
            'drag': avg_drag,
            'collapse_prob': avg_prob
        }

        print(f"  Total Energy (local):  {energy['total_energy']:.4f}")
        print(f"  Trajectory Deviation:  {energy['trajectory_deviation']:.4f}")
        print(f"  Undercurrent Friction: {energy['undercurrent_friction']:.4f}")
        print(f"  Self-Prediction Error: {energy['self_prediction_error']:.4f}")

        print_subheader("Friction Breakdown (Local)")
        for term, value in friction.items():
            bar = "#" * int(value * 20)
            print(f"  {term:15s}: {value:.4f} |{bar}")

        print_subheader("Feature Trajectory Built")
        print(f"  Shape: [1, {len(trajectory)}, 64]")
        print(f"  Ready for UFE API when available")

    # Interpretation
    print_header("5. INTERPRETATION")

    if 'total_energy' in energy:
        symbol, description = interpret_energy(energy['total_energy'])
        print(f"\n  [{symbol}] {description}")

        if friction:
            print_subheader("Friction Analysis")
            for interp in interpret_friction(friction):
                print(interp)

    # Analyze specific crisis periods
    print_header("6. CRISIS PERIOD DEEP DIVE")

    crisis_periods = [
        ("2008 Financial Crisis", datapoints[0:3]),  # 2006-2008
        ("COVID-19 Shock", datapoints[3:5]),         # 2019-2020
        ("2022 Rate Hikes", datapoints[5:8]),        # 2021-2023
    ]

    for name, period_data in crisis_periods:
        if len(period_data) < 2:
            continue

        print_subheader(name)
        print(f"  Period: {format_period(period_data)}")

        # NIV context (always available)
        niv_start = period_data[0].niv_score
        niv_end = period_data[-1].niv_score
        prob_start = period_data[0].recession_probability
        prob_end = period_data[-1].recession_probability
        avg_drag = sum(dp.components.drag for dp in period_data) / len(period_data)
        avg_prob = sum(dp.recession_probability for dp in period_data) / len(period_data)

        # Local energy computation
        niv_var = sum((dp.niv_score - niv_start) ** 2 for dp in period_data) / len(period_data)
        local_energy = min(1.0, (niv_var / 500 + avg_prob + avg_drag) / 3)

        print(f"  Energy (local): {local_energy:.4f}")
        print(f"  Friction: drag={avg_drag:.3f}, collapse_prob={avg_prob:.3f}")
        print(f"  NIV:      {niv_start:+.1f} -> {niv_end:+.1f}")
        print(f"  P(rec):   {prob_start:.2f} -> {prob_end:.2f}")

        # Interpretation
        if niv_end < niv_start and prob_end > prob_start:
            print(f"  Status:   DETERIORATING - NIV falling, recession risk rising")
        elif niv_end > niv_start and prob_end < prob_start:
            print(f"  Status:   RECOVERING - NIV rising, recession risk falling")
        else:
            print(f"  Status:   MIXED - cross-currents detected")

    # Demo endpoint test
    print_header("7. UFE API ENDPOINT INFO")
    if api_available:
        try:
            demo_data = ufe.client.demo("macro")
            print(f"  Demo data shape: {demo_data.get('shape', 'N/A')}")
            print(f"  Domain: {demo_data.get('domain', 'macro')}")

            if 'data' in demo_data:
                demo_energy = ufe.client.energy(demo_data['data'], "macro")
                print(f"  Demo energy: {demo_energy.get('total_energy', 0):.4f}")
        except Exception as e:
            print(f"  API call failed: {type(e).__name__}")
    else:
        print("  UFE API Endpoints (for external use):")
        print(f"  Base URL: {ufe.client.base_url}")
        print(f"  - GET  /api/health           -> {{status, latent_dim, domains}}")
        print(f"  - GET  /api/demo/macro       -> Demo trajectory data")
        print(f"  - POST /api/encode           -> Encode trajectory to latent space")
        print(f"  - POST /api/energy           -> Compute energy & friction")
        print(f"  - POST /api/friction         -> Friction from latent vectors")
        print(f"  - POST /api/predict          -> Predict future trajectory")

    # Summary
    print_header("8. SUMMARY", "=")
    print("""
  The UFE integration maps NIV economic data to a 64-dimensional feature
  space for latent analysis. Key findings:

  - Energy function captures systemic instability across economic regimes
  - Friction terms (drag, collapse_prob) align with NIV's drag component
  - Latent encoding enables prediction of economic state trajectories
  - Crisis periods show elevated energy and friction, matching NIV signals

  Formula: E = a*trajectory_deviation + b*undercurrent_friction + c*self_prediction_error

  Use this integration to:
  1. Encode NIV time series into latent representations
  2. Compute energy to detect regime changes and instability
  3. Analyze friction buildup before economic transitions
  4. Generate forward trajectory predictions
""")

    # Cleanup
    ufe.close()
    print("\nDemo complete.")


if __name__ == "__main__":
    main()
