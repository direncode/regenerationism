"""
Undercurrent Flux Engine (UFE) API Client

Synchronous client for macro-economic world modeling via the UFE API.
Energy function: E = α×trajectory_deviation + β×undercurrent_friction + γ×self_prediction_error

Domain: macro
- Input dimensions: 64 features
- Friction terms: drag, collapse_prob
"""

import httpx
from typing import List, Dict, Any, Optional


class UFEClient:
    """
    Synchronous client for the Undercurrent Flux Engine (UFE) API.

    Provides macro-economic world modeling through latent space encoding,
    energy computation, friction analysis, and trajectory prediction.

    Example:
        client = UFEClient()
        health = client.health()
        demo_data = client.demo("macro")
        energy = client.energy(demo_data["data"], "macro")
    """

    def __init__(
        self,
        base_url: str = "https://latentintegrator-j3ul23w91-direns-projects-6fcf4bec.vercel.app",
        timeout: float = 30.0
    ):
        """
        Initialize the UFE client.

        Args:
            base_url: API base URL
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(timeout=timeout)

    def health(self) -> Dict[str, Any]:
        """
        Check API health status.

        Returns:
            Dict with status, latent_dim, and available domains
        """
        response = self.client.get(f"{self.base_url}/api/health")
        response.raise_for_status()
        return response.json()

    def demo(self, domain: str) -> Dict[str, Any]:
        """
        Generate demo trajectory data for a domain.

        Args:
            domain: Domain name (macro, agents, capsules, governance, football)

        Returns:
            Dict with demo trajectory data
        """
        response = self.client.get(f"{self.base_url}/api/demo/{domain}")
        response.raise_for_status()
        return response.json()

    def encode(self, data: List, domain: str) -> Dict[str, Any]:
        """
        Encode input data into latent space vectors.

        Args:
            data: Input trajectory [batch, timesteps, features]
            domain: Domain name

        Returns:
            Dict with latent vectors and shape info
        """
        response = self.client.post(
            f"{self.base_url}/api/encode",
            json={"data": data, "domain": domain}
        )
        response.raise_for_status()
        return response.json()

    def energy(
        self,
        data: List,
        domain: str,
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Compute energy for input trajectory data.

        Energy function: E = α×trajectory_deviation + β×undercurrent_friction + γ×self_prediction_error

        Args:
            data: Input trajectory [batch, timesteps, features]
            domain: Domain name
            weights: Optional energy term weights

        Returns:
            Dict with total_energy, trajectory_deviation, undercurrent_friction,
            self_prediction_error, and friction_breakdown
        """
        body: Dict[str, Any] = {"data": data, "domain": domain}
        if weights:
            body["weights"] = weights
        response = self.client.post(f"{self.base_url}/api/energy", json=body)
        response.raise_for_status()
        return response.json()

    def friction(self, latent: List, domain: str) -> Dict[str, Any]:
        """
        Compute friction terms from latent vectors.

        Args:
            latent: Latent vectors [batch, latent_dim]
            domain: Domain name

        Returns:
            Dict with friction analysis (drag, collapse_prob for macro domain)
        """
        response = self.client.post(
            f"{self.base_url}/api/friction",
            json={"latent": latent, "domain": domain}
        )
        response.raise_for_status()
        return response.json()

    def predict(self, latent: List, num_steps: int = 10) -> Dict[str, Any]:
        """
        Predict future trajectory from latent vectors.

        Args:
            latent: Latent vectors [batch, latent_dim]
            num_steps: Number of prediction steps

        Returns:
            Dict with predicted trajectory and shape info
        """
        response = self.client.post(
            f"{self.base_url}/api/predict",
            json={"latent": latent, "num_steps": num_steps}
        )
        response.raise_for_status()
        return response.json()

    def close(self):
        """Close the HTTP client."""
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
