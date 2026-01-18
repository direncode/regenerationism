"""
NIV (National Impact Velocity) Analysis Script
==============================================

This script reproduces the NIV recession probability analysis with professional
visualizations suitable for academic papers and presentations.

Requirements:
    pip install pandas numpy matplotlib seaborn scikit-learn

Usage:
    python niv_analysis.py --input niv_data.csv --output ./plots/

Or use the exported CSV from the Explorer page at regenerationism.ai/explorer
"""

import argparse
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import roc_curve, auc, confusion_matrix
from datetime import datetime
from pathlib import Path

# =============================================================================
# CONFIGURATION
# =============================================================================

# Probability mapping parameters (must match fredApi.ts)
LOGISTIC_K = 80           # Steepness parameter
LOGISTIC_THRESHOLD = 0.025  # Inflection point (NIV value at 50% probability)

# NBER recession periods (start, end, name)
NBER_RECESSIONS = [
    ('1960-04', '1961-02', '1960-61 Recession'),
    ('1969-12', '1970-11', '1969-70 Recession'),
    ('1973-11', '1975-03', '1973-75 Recession'),
    ('1980-01', '1980-07', '1980 Recession'),
    ('1981-07', '1982-11', '1981-82 Recession'),
    ('1990-07', '1991-03', '1990-91 Recession'),
    ('2001-03', '2001-11', '2001 Recession'),
    ('2007-12', '2009-06', 'Great Recession'),
    ('2020-02', '2020-04', 'COVID-19 Recession'),
]

# Plot styling
plt.style.use('seaborn-v0_8-darkgrid')
COLORS = {
    'niv': '#22c55e',       # Green
    'probability': '#f97316',  # Orange
    'recession': '#ef4444',    # Red
    'expansion': '#22c55e',    # Green
    'threshold': '#737373',    # Gray
}


# =============================================================================
# PROBABILITY MAPPING
# =============================================================================

def logistic_probability(niv: np.ndarray, k: float = LOGISTIC_K, threshold: float = LOGISTIC_THRESHOLD) -> np.ndarray:
    """
    Map raw NIV values to recession probability using adjusted logistic function.

    P(recession) = 100 / (1 + exp(k * (NIV - threshold)))

    Args:
        niv: Raw NIV values (can be negative)
        k: Steepness parameter (higher = steeper transition)
        threshold: NIV value at 50% probability

    Returns:
        Recession probability in range [0, 100]
    """
    return 100 / (1 + np.exp(k * (niv - threshold)))


# =============================================================================
# VISUALIZATION FUNCTIONS
# =============================================================================

def plot_time_series_with_recessions(df: pd.DataFrame, output_dir: Path) -> None:
    """
    Create time series plot with NBER recession shading.

    Args:
        df: DataFrame with columns ['date', 'niv_score', 'recession_probability', 'is_recession']
        output_dir: Directory to save plots
    """
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10), sharex=True)

    # Convert date to datetime for plotting
    dates = pd.to_datetime(df['date'])

    # Plot 1: NIV Score
    ax1.plot(dates, df['niv_score'], color=COLORS['niv'], linewidth=1.5, label='NIV Score')
    ax1.axhline(y=0, color=COLORS['threshold'], linestyle='--', alpha=0.5)
    ax1.set_ylabel('NIV Score', fontsize=12)
    ax1.set_title('National Impact Velocity (NIV) with NBER Recession Periods', fontsize=14, fontweight='bold')
    ax1.legend(loc='upper right')

    # Add recession shading to NIV plot
    for start, end, name in NBER_RECESSIONS:
        start_dt = pd.to_datetime(start)
        end_dt = pd.to_datetime(end)
        if start_dt >= dates.min() and end_dt <= dates.max():
            ax1.axvspan(start_dt, end_dt, alpha=0.3, color='gray', label='_nolegend_')

    # Plot 2: Recession Probability
    ax2.plot(dates, df['recession_probability'], color=COLORS['probability'], linewidth=1.5, label='Recession Probability')
    ax2.axhline(y=50, color=COLORS['threshold'], linestyle='--', alpha=0.7, label='50% Threshold')
    ax2.set_ylabel('Probability (%)', fontsize=12)
    ax2.set_xlabel('Date', fontsize=12)
    ax2.set_ylim(0, 100)
    ax2.legend(loc='upper right')

    # Add recession shading to probability plot
    for start, end, name in NBER_RECESSIONS:
        start_dt = pd.to_datetime(start)
        end_dt = pd.to_datetime(end)
        if start_dt >= dates.min() and end_dt <= dates.max():
            ax2.axvspan(start_dt, end_dt, alpha=0.15, color=COLORS['recession'], label='_nolegend_')

    plt.tight_layout()
    plt.savefig(output_dir / 'niv_time_series.png', dpi=300, bbox_inches='tight')
    plt.savefig(output_dir / 'niv_time_series.pdf', bbox_inches='tight')
    print(f"Saved: niv_time_series.png/pdf")
    plt.close()


def plot_boxplot_by_regime(df: pd.DataFrame, output_dir: Path) -> None:
    """
    Create box plots comparing probability distributions by economic regime.

    Args:
        df: DataFrame with columns ['recession_probability', 'is_recession']
        output_dir: Directory to save plots
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    # Prepare data
    df['regime'] = df['is_recession'].map({True: 'Recession', False: 'Expansion'})

    # Create box plot
    box_colors = [COLORS['expansion'], COLORS['recession']]
    bp = ax.boxplot(
        [df[df['regime'] == 'Expansion']['recession_probability'],
         df[df['regime'] == 'Recession']['recession_probability']],
        labels=['Expansion', 'Recession'],
        patch_artist=True,
        widths=0.6
    )

    # Color the boxes
    for patch, color in zip(bp['boxes'], box_colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.6)

    # Style the plot
    ax.set_ylabel('Recession Probability (%)', fontsize=12)
    ax.set_xlabel('Economic Regime', fontsize=12)
    ax.set_title('Recession Probability Distribution by Economic Regime', fontsize=14, fontweight='bold')
    ax.axhline(y=50, color=COLORS['threshold'], linestyle='--', alpha=0.7, label='50% Threshold')
    ax.set_ylim(0, 100)
    ax.legend()

    # Add statistics annotations
    for i, regime in enumerate(['Expansion', 'Recession']):
        data = df[df['regime'] == regime]['recession_probability']
        stats_text = f'n={len(data)}\nmean={data.mean():.1f}%\nmedian={data.median():.1f}%'
        ax.annotate(stats_text, xy=(i + 1, 5), ha='center', fontsize=9,
                   bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

    plt.tight_layout()
    plt.savefig(output_dir / 'niv_boxplot_regime.png', dpi=300, bbox_inches='tight')
    plt.savefig(output_dir / 'niv_boxplot_regime.pdf', bbox_inches='tight')
    print(f"Saved: niv_boxplot_regime.png/pdf")
    plt.close()


def plot_roc_curve(df: pd.DataFrame, output_dir: Path) -> dict:
    """
    Create ROC curve with AUC calculation.

    Args:
        df: DataFrame with columns ['recession_probability', 'is_recession']
        output_dir: Directory to save plots

    Returns:
        Dictionary with AUC and other metrics
    """
    # Calculate ROC curve
    fpr, tpr, thresholds = roc_curve(df['is_recession'], df['recession_probability'])
    roc_auc = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=(8, 8))

    # Plot ROC curve
    ax.plot(fpr, tpr, color=COLORS['probability'], linewidth=2,
            label=f'NIV Model (AUC = {roc_auc:.3f})')

    # Plot diagonal (random classifier)
    ax.plot([0, 1], [0, 1], color=COLORS['threshold'], linestyle='--',
            linewidth=1.5, label='Random Classifier (AUC = 0.5)')

    # Find optimal threshold (Youden's J statistic)
    j_scores = tpr - fpr
    optimal_idx = np.argmax(j_scores)
    optimal_threshold = thresholds[optimal_idx]

    # Mark optimal point
    ax.scatter([fpr[optimal_idx]], [tpr[optimal_idx]], color=COLORS['recession'],
              s=100, zorder=5, label=f'Optimal Threshold ({optimal_threshold:.1f}%)')

    # Style the plot
    ax.set_xlabel('False Positive Rate', fontsize=12)
    ax.set_ylabel('True Positive Rate', fontsize=12)
    ax.set_title('ROC Curve for NIV Recession Prediction', fontsize=14, fontweight='bold')
    ax.legend(loc='lower right', fontsize=10)
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(-0.02, 1.02)
    ax.set_aspect('equal')

    # Add grid
    ax.grid(True, alpha=0.3)

    # Add AUC annotation
    ax.annotate(f'AUC = {roc_auc:.3f}', xy=(0.6, 0.2), fontsize=16, fontweight='bold',
               bbox=dict(boxstyle='round', facecolor='white', edgecolor='gray', alpha=0.9))

    plt.tight_layout()
    plt.savefig(output_dir / 'niv_roc_curve.png', dpi=300, bbox_inches='tight')
    plt.savefig(output_dir / 'niv_roc_curve.pdf', bbox_inches='tight')
    print(f"Saved: niv_roc_curve.png/pdf")
    plt.close()

    # Calculate confusion matrix at 50% threshold
    y_pred = df['recession_probability'] >= 50
    y_true = df['is_recession']
    cm = confusion_matrix(y_true, y_pred)

    tn, fp, fn, tp = cm.ravel()
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
    accuracy = (tp + tn) / len(df)

    return {
        'auc': roc_auc,
        'optimal_threshold': optimal_threshold,
        'sensitivity': sensitivity,
        'specificity': specificity,
        'accuracy': accuracy,
        'true_positives': tp,
        'false_positives': fp,
        'true_negatives': tn,
        'false_negatives': fn,
    }


def plot_probability_mapping(output_dir: Path) -> None:
    """
    Visualize the logistic probability mapping function.

    Args:
        output_dir: Directory to save plots
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    # Generate NIV range
    niv_range = np.linspace(-0.02, 0.08, 1000)
    probability = logistic_probability(niv_range)

    # Plot the mapping function
    ax.plot(niv_range, probability, color=COLORS['probability'], linewidth=2.5)

    # Add reference lines
    ax.axhline(y=50, color=COLORS['threshold'], linestyle='--', alpha=0.7, label='50% Probability')
    ax.axvline(x=LOGISTIC_THRESHOLD, color=COLORS['threshold'], linestyle='--', alpha=0.7, label=f'Threshold (NIV={LOGISTIC_THRESHOLD})')

    # Add zone labels
    ax.fill_between(niv_range, probability, 70, where=(probability >= 70),
                   alpha=0.2, color=COLORS['recession'], label='Crisis Zone (≥70%)')
    ax.fill_between(niv_range, probability, 0, where=(probability < 20),
                   alpha=0.2, color=COLORS['expansion'], label='Expansion Zone (<20%)')

    # Style the plot
    ax.set_xlabel('NIV Score', fontsize=12)
    ax.set_ylabel('Recession Probability (%)', fontsize=12)
    ax.set_title(f'Logistic Probability Mapping\nP = 100 / (1 + exp({LOGISTIC_K} × (NIV - {LOGISTIC_THRESHOLD})))',
                fontsize=14, fontweight='bold')
    ax.legend(loc='upper right', fontsize=10)
    ax.set_ylim(0, 100)
    ax.set_xlim(-0.02, 0.08)
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_dir / 'niv_probability_mapping.png', dpi=300, bbox_inches='tight')
    plt.savefig(output_dir / 'niv_probability_mapping.pdf', bbox_inches='tight')
    print(f"Saved: niv_probability_mapping.png/pdf")
    plt.close()


def generate_summary_report(df: pd.DataFrame, metrics: dict, output_dir: Path) -> str:
    """
    Generate a text summary report.

    Args:
        df: DataFrame with NIV data
        metrics: Dictionary with ROC metrics
        output_dir: Directory to save report

    Returns:
        Summary text
    """
    # Calculate additional statistics
    recession_data = df[df['is_recession'] == True]['recession_probability']
    expansion_data = df[df['is_recession'] == False]['recession_probability']

    date_range = f"{df['date'].min()} to {df['date'].max()}"

    summary = f"""
================================================================================
NIV (National Impact Velocity) Analysis Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
================================================================================

DATA SUMMARY
------------
Date Range: {date_range}
Total Observations: {len(df)}
Recession Months: {len(recession_data)}
Expansion Months: {len(expansion_data)}

PROBABILITY MAPPING
-------------------
Formula: P(recession) = 100 / (1 + exp(k × (NIV - θ)))
Steepness (k): {LOGISTIC_K}
Threshold (θ): {LOGISTIC_THRESHOLD}
NIV at 50% probability: {LOGISTIC_THRESHOLD}

MODEL PERFORMANCE (at 50% threshold)
------------------------------------
ROC AUC: {metrics['auc']:.3f}
Sensitivity (True Positive Rate): {metrics['sensitivity']:.1%}
Specificity (True Negative Rate): {metrics['specificity']:.1%}
Accuracy: {metrics['accuracy']:.1%}
Optimal Threshold: {metrics['optimal_threshold']:.1f}%

CONFUSION MATRIX
----------------
                  Predicted
              Positive  Negative
Actual Positive    {metrics['true_positives']:5d}     {metrics['false_negatives']:5d}
Actual Negative    {metrics['false_positives']:5d}     {metrics['true_negatives']:5d}

PROBABILITY DISTRIBUTION BY REGIME
----------------------------------
Expansion Periods:
  - Mean: {expansion_data.mean():.1f}%
  - Median: {expansion_data.median():.1f}%
  - Min: {expansion_data.min():.1f}%
  - Max: {expansion_data.max():.1f}%

Recession Periods:
  - Mean: {recession_data.mean():.1f}%
  - Median: {recession_data.median():.1f}%
  - Min: {recession_data.min():.1f}%
  - Max: {recession_data.max():.1f}%

PRESENTATION SUMMARY
--------------------
The National Impact Velocity (NIV) indicator uses an adjusted logistic function
to map raw NIV values to recession probabilities. With k={LOGISTIC_K} and
threshold={LOGISTIC_THRESHOLD}, the model achieves an AUC of {metrics['auc']:.2f}
on {len(df)} monthly observations from {date_range}. The logistic mapping
provides smooth probability transitions that reduce false alarms while
maintaining sensitivity to genuine economic stress signals.

================================================================================
"""

    # Save report
    report_path = output_dir / 'niv_analysis_report.txt'
    with open(report_path, 'w') as f:
        f.write(summary)
    print(f"Saved: niv_analysis_report.txt")

    return summary


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='NIV Recession Probability Analysis')
    parser.add_argument('--input', '-i', type=str, required=True,
                       help='Path to CSV file exported from regenerationism.ai/explorer')
    parser.add_argument('--output', '-o', type=str, default='./plots',
                       help='Output directory for plots (default: ./plots)')
    args = parser.parse_args()

    # Create output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load data
    print(f"\nLoading data from: {args.input}")
    df = pd.read_csv(args.input)

    # Expected columns from Explorer CSV export
    required_cols = ['date', 'niv_score', 'recession_probability', 'is_recession']
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    # Convert is_recession to boolean if needed
    if df['is_recession'].dtype == object:
        df['is_recession'] = df['is_recession'].str.lower() == 'true'

    print(f"Loaded {len(df)} observations from {df['date'].min()} to {df['date'].max()}")
    print(f"Recession months: {df['is_recession'].sum()}")
    print(f"Expansion months: {(~df['is_recession']).sum()}")

    # Generate all plots
    print(f"\nGenerating visualizations in: {output_dir}")

    plot_time_series_with_recessions(df, output_dir)
    plot_boxplot_by_regime(df, output_dir)
    metrics = plot_roc_curve(df, output_dir)
    plot_probability_mapping(output_dir)

    # Generate summary report
    summary = generate_summary_report(df, metrics, output_dir)
    print(summary)

    print(f"\n✓ Analysis complete! All outputs saved to: {output_dir}")


if __name__ == '__main__':
    main()
