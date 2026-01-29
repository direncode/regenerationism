"""
Undercurrent Flux Engine (UFE) API Client

Async client for macro-economic world modeling via the UFE API.
Energy function: E = α×trajectory_deviation + β×undercurrent_friction + γ×self_prediction_error

Domain: macro
- Input dimensions: 64 features
- Friction terms: drag, collapse_prob
"""

import httpx
from typing import Any
from dataclasses import dataclass


@dataclass
class EnergyResult:
    """Energy computation result from the UFE API."""
    total_energy: float
    trajectory_deviation: float
    undercurrent_friction: float
    friction_breakdown: dict[str, float]  # Contains 'drag' and 'collapse_prob'


@dataclass
class HealthStatus:
    """Health check response from the UFE API."""
    status: str
    latent_dim: int
    domains: list[str]


class UFEClient:
    """
    Async client for the Undercurrent Flux Engine (UFE) API.

    Provides macro-economic world modeling through latent space encoding,
    energy computation, friction analysis, and trajectory prediction.

    Example:
        async with UFEClient() as client:
            health = await client.health()
            demo_data = await client.demo()
            latent = await client.encode(demo_data)
            energy = await client.energy(demo_data)
            friction = await client.friction(latent)
            prediction = await client.predict(latent, steps=10)
    """

    BASE_URL = "https://latentintegrator-j3ul23w91-direns-projects-6fcf4bec.vercel.app"
    DOMAIN = "macro"
    INPUT_DIM = 64
    LATENT_DIM = 256
    FRICTION_TERMS = ("drag", "collapse_prob")

    def __init__(self, base_url: str | None = None, timeout: float = 30.0):
        """
        Initialize the UFE client.

        Args:
            base_url: Override the default API base URL
            timeout: Request timeout in seconds
        """
        self._base_url = (base_url or self.BASE_URL).rstrip("/")
        self._timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> "UFEClient":
        """Enter async context manager."""
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
            headers={"Content-Type": "application/json"}
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Exit async context manager."""
        if self._client:
            await self._client.aclose()
            self._client = None

    def _get_client(self) -> httpx.AsyncClient:
        """Get the HTTP client, raising if not in context."""
        if self._client is None:
            raise RuntimeError(
                "UFEClient must be used as async context manager: "
                "async with UFEClient() as client: ..."
            )
        return self._client

    async def health(self) -> HealthStatus:
        """
        Check API health status.

        Returns:
            HealthStatus with status, latent_dim, and available domains
        """
        client = self._get_client()
        response = await client.get("/api/health")
        response.raise_for_status()
        data = response.json()
        return HealthStatus(
            status=data["status"],
            latent_dim=data["latent_dim"],
            domains=data["domains"]
        )

    async def demo(self) -> list[list[list[float]]]:
        """
        Generate demo trajectory data for the macro domain.

        Returns:
            Demo trajectory data as nested list [batch, timesteps, 64 features]
        """
        client = self._get_client()
        response = await client.get("/api/demo/macro")
        response.raise_for_status()
        data = response.json()
        return data.get("data", data)

    async def encode(self, data: list[list[list[float]]]) -> list[list[float]]:
        """
        Encode input data into latent space vectors.

        Args:
            data: Input trajectory [batch, timesteps, 64 features]

        Returns:
            Latent vectors [batch, 256 dimensions]
        """
        client = self._get_client()
        response = await client.post(
            "/api/encode",
            json={"data": data, "domain": self.DOMAIN}
        )
        response.raise_for_status()
        result = response.json()
        return result.get("latent", result)

    async def energy(self, data: list[list[list[float]]]) -> EnergyResult:
        """
        Compute energy for input trajectory data.

        Energy function: E = α×trajectory_deviation + β×undercurrent_friction + γ×self_prediction_error

        Args:
            data: Input trajectory [batch, timesteps, 64 features]

        Returns:
            EnergyResult with total_energy, trajectory_deviation,
            undercurrent_friction, and friction_breakdown (drag, collapse_prob)
        """
        client = self._get_client()
        response = await client.post(
            "/api/energy",
            json={"data": data, "domain": self.DOMAIN}
        )
        response.raise_for_status()
        result = response.json()
        return EnergyResult(
            total_energy=result["total_energy"],
            trajectory_deviation=result["trajectory_deviation"],
            undercurrent_friction=result["undercurrent_friction"],
            friction_breakdown=result["friction_breakdown"]
        )

    async def friction(self, latent: list[list[float]]) -> dict[str, Any]:
        """
        Compute friction terms from latent vectors.

        Args:
            latent: Latent vectors [batch, 256 dimensions]

        Returns:
            Friction analysis including drag and collapse_prob terms
        """
        client = self._get_client()
        response = await client.post(
            "/api/friction",
            json={"latent": latent, "domain": self.DOMAIN}
        )
        response.raise_for_status()
        return response.json()

    async def predict(
        self,
        latent: list[list[float]],
        steps: int = 10
    ) -> list[list[list[float]]]:
        """
        Predict future trajectory from latent vectors.

        Args:
            latent: Latent vectors [batch, 256 dimensions]
            steps: Number of prediction steps

        Returns:
            Predicted trajectory [batch, steps, features]
        """
        client = self._get_client()
        response = await client.post(
            "/api/predict",
            json={"latent": latent, "num_steps": steps}
        )
        response.raise_for_status()
        result = response.json()
        return result.get("trajectory", result)


async def main():
    """Demo usage of the UFE client."""
    async with UFEClient() as client:
        # Check health
        health = await client.health()
        print(f"API Status: {health.status}")
        print(f"Latent dimensions: {health.latent_dim}")
        print(f"Available domains: {health.domains}")

        # Get demo data
        print("\nFetching demo data...")
        demo_data = await client.demo()
        print(f"Demo data shape: {len(demo_data)} x {len(demo_data[0])} x {len(demo_data[0][0])}")

        # Encode to latent space
        print("\nEncoding to latent space...")
        latent = await client.encode(demo_data)
        print(f"Latent shape: {len(latent)} x {len(latent[0])}")

        # Compute energy
        print("\nComputing energy...")
        energy = await client.energy(demo_data)
        print(f"Total energy: {energy.total_energy:.4f}")
        print(f"Trajectory deviation: {energy.trajectory_deviation:.4f}")
        print(f"Undercurrent friction: {energy.undercurrent_friction:.4f}")
        print(f"Friction breakdown: {energy.friction_breakdown}")

        # Compute friction from latent
        print("\nComputing friction from latent...")
        friction = await client.friction(latent)
        print(f"Friction result: {friction}")

        # Predict trajectory
        print("\nPredicting trajectory (10 steps)...")
        prediction = await client.predict(latent, steps=10)
        print(f"Prediction shape: {len(prediction)} x {len(prediction[0])} x {len(prediction[0][0])}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
