import io
import os
import pytest
from unittest.mock import MagicMock, patch
from PIL import Image
from starlette.testclient import TestClient

# Ensure test environment variables are set before importing app
os.environ["GEMINI_API_KEY"] = "mock_primary_key_12345678"
os.environ["GEMINI_API_KEY_SECONDARY"] = "mock_secondary_key_87654321"
os.environ["SIGNATURE_SECRET"] = "test_signature_secret_for_unit_tests_32chars"
os.environ["ADMIN_SECRET"] = "test_admin_secret_for_unit_tests_32chars"
os.environ["DYNAMODB_TABLE"] = "Test-Loafed-Leaderboard"
os.environ["S3_THUMBNAILS_BUCKET"] = "test-loafed-thumbnails"
os.environ["COGNITO_USER_POOL_ID"] = "us-east-1_TestPool"
os.environ["COGNITO_CLIENT_ID"] = "test_client_id_123"
os.environ["AWS_REGION"] = "us-east-1"

import app


@pytest.fixture
def client():
    """Returns a Starlette/FastAPI TestClient for app."""
    return TestClient(app.app, raise_server_exceptions=False)


@pytest.fixture
def sample_image_bytes():
    """Generates a small in-memory JPEG image for upload testing."""
    img = Image.new("RGB", (200, 200), color=(255, 180, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def sample_png_bytes():
    """Generates a small in-memory PNG image."""
    img = Image.new("RGBA", (150, 150), color=(100, 200, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def valid_loaf_analysis():
    """Returns a valid dictionary structure matching LoafAnalysisResult."""
    return {
        "cat_name": "Test Loaf Mochi",
        "loaf_score": 95.5,
        "paw_concealment_score": 98.0,
        "tail_tuck_score": 94.0,
        "elbow_tuck_score": 96.0,
        "boule_roundness_score": 94.0,
        "aerodynamic_drag": 0.04,
        "bread_classification": "Golden Brioche Loaf",
        "critique": "Magnificent geometry and seamless peet concealment.",
        "baker_advice": "Maintain current resting posture for optimal rise.",
        "detected_angles": ["front", "side"],
        "angle_analysis": {
            "front": {
                "visible": True,
                "paw_visibility": "hidden",
                "notes": "Paws completely tucked under chest."
            },
            "side": {
                "visible": True,
                "paw_visibility": "hidden",
                "notes": "Tight sphinx curvature with zero overhang."
            }
        }
    }


@pytest.fixture
def sample_grade_token(valid_loaf_analysis):
    """Generates a valid HMAC-signed grade token for testing."""
    return app.generate_grade_token(valid_loaf_analysis)
