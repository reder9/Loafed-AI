import base64
import json
import time
import pytest
from fastapi import HTTPException
import app


class TestGradeTokenSecurity:
    """Tests generation, signature verification, and anti-tamper mechanisms for grade tokens."""

    @pytest.fixture
    def sample_data(self):
        return {
            "cat_name": "Mochi",
            "overall_score": 94,
            "grade_letter": "A+",
            "loaf_rank": "Grandmaster",
            "bread_classification": "Golden Brioche Loaf",
            "summary_critique": "Impeccable curvature.",
            "drag_coefficient": 0.03,
            "can_submit": True
        }

    def test_generate_and_verify_valid_token(self, sample_data):
        token = app.generate_grade_token(sample_data, image_hash="sha256_mock_hash", can_submit=True)
        assert "." in token

        verified = app.verify_grade_token(token)
        assert verified["cat_name"] == "Mochi"
        assert verified["overall_score"] == 94
        assert verified["can_submit"] is True
        assert verified["image_sha256"] == "sha256_mock_hash"

    def test_example_cat_token_has_can_submit_false(self, sample_data):
        token = app.generate_grade_token(sample_data, can_submit=False)
        verified = app.verify_grade_token(token)
        assert verified["can_submit"] is False

    def test_empty_or_malformed_token_raises_400(self):
        for bad_token in ["", None, "no_dot_token", "one.two.three.four"]:
            with pytest.raises(HTTPException) as exc_info:
                app.verify_grade_token(bad_token)
            assert exc_info.value.status_code == 400

    def test_tampered_signature_rejected(self, sample_data):
        token = app.generate_grade_token(sample_data)
        encoded, signature = token.rsplit(".", 1)

        # Alter the last character of the hex signature
        corrupted_sig = signature[:-1] + ("a" if signature[-1] != "a" else "b")
        tampered_token = f"{encoded}.{corrupted_sig}"

        with pytest.raises(HTTPException) as exc_info:
            app.verify_grade_token(tampered_token)
        assert exc_info.value.status_code == 400
        assert "tampered" in exc_info.value.detail.lower()

    def test_tampered_payload_rejected(self, sample_data):
        token = app.generate_grade_token(sample_data)
        encoded, signature = token.rsplit(".", 1)

        # Decode payload, boost score from 94 to 100, re-encode WITHOUT updating signature
        payload = json.loads(base64.urlsafe_b64decode(encoded.encode()).decode())
        payload["overall_score"] = 100
        new_encoded = base64.urlsafe_b64encode(json.dumps(payload, sort_keys=True).encode()).decode()

        tampered_token = f"{new_encoded}.{signature}"

        with pytest.raises(HTTPException) as exc_info:
            app.verify_grade_token(tampered_token)
        assert exc_info.value.status_code == 400
        assert "tampered" in exc_info.value.detail.lower()

    def test_expired_token_rejected(self, sample_data, monkeypatch):
        token = app.generate_grade_token(sample_data)
        encoded, signature = token.rsplit(".", 1)

        # Tamper payload timestamp to 25 hours ago, re-sign legitimately to isolate expiry check
        payload = json.loads(base64.urlsafe_b64decode(encoded.encode()).decode())
        payload["ts"] = int(time.time() - 90000)  # > 86400 seconds
        new_encoded = base64.urlsafe_b64encode(json.dumps(payload, sort_keys=True).encode()).decode()

        # Sign it with the correct secret
        import hmac, hashlib
        new_sig = hmac.new(app.SIGNATURE_SECRET.encode(), new_encoded.encode(), hashlib.sha256).hexdigest()
        expired_token = f"{new_encoded}.{new_sig}"

        with pytest.raises(HTTPException) as exc_info:
            app.verify_grade_token(expired_token)
        assert exc_info.value.status_code == 400
        assert "expired" in exc_info.value.detail.lower()

    def test_corrupted_base64_payload_rejected(self):
        # Valid signature format but garbage base64
        fake_encoded = "???not_valid_b64!!!"
        import hmac, hashlib
        sig = hmac.new(app.SIGNATURE_SECRET.encode(), fake_encoded.encode(), hashlib.sha256).hexdigest()
        bad_token = f"{fake_encoded}.{sig}"

        with pytest.raises(HTTPException) as exc_info:
            app.verify_grade_token(bad_token)
        assert exc_info.value.status_code == 400
        assert "failed to parse" in exc_info.value.detail.lower()
