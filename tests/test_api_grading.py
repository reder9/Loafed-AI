import io
import json
import hashlib
from unittest.mock import MagicMock, patch
import pytest
import app


class TestApiGrading:
    """Tests the POST /api/grade endpoint including honeypot, validation, example cat rejection, and AI mock responses."""

    def test_age_confirmation_required_before_photo_processing(self, client, sample_image_bytes):
        files = [("images", ("cat.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
        res = client.post("/api/grade", files=files)
        assert res.status_code == 403
        assert "18 or older" in res.json()["detail"]

    def test_honeypot_bot_submission_rejected(self, client, sample_image_bytes):
        files = [("images", ("cat.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
        data = {"website_url_check": "http://spambot.com", "age_confirmed": "true"}
        res = client.post("/api/grade", data=data, files=files)
        assert res.status_code == 400
        assert "Automated submission blocked" in res.text

    def test_no_images_uploaded_raises_400(self, client):
        res = client.post("/api/grade", data={"cat_name": "Ghost Cat", "age_confirmed": "true"})
        assert res.status_code == 400
        assert "upload between 1 and 5" in res.text

    def test_example_cat_photo_upload_rejected(self, client):
        """Verifies that uploading benchmark photos (Buttercup, Chonks, Flash) is rejected."""
        # Buttercup front sample hash is in app.SAMPLE_IMAGE_HASHES
        # We can simulate by creating an image whose hash matches one in app.SAMPLE_IMAGE_HASHES
        target_hash = list(app.SAMPLE_IMAGE_HASHES)[0]
        
        # Patch submitted hashes or create a dummy matching hash
        with patch("app.hashlib.sha256") as mock_sha:
            mock_hash_obj = MagicMock()
            mock_hash_obj.hexdigest.return_value = target_hash
            mock_sha.return_value = mock_hash_obj

            fake_bytes = b"fake_buttercup_bytes"
            files = [("images", ("buttercup.jpg", io.BytesIO(fake_bytes), "image/jpeg"))]
            
            # Mock read_and_validate_image so it accepts our bytes
            with patch("app.read_and_validate_image", return_value=(fake_bytes, "image/jpeg")):
                res = client.post("/api/grade", data={"age_confirmed": "true"}, files=files)
                assert res.status_code == 400
                assert "Benchmark example cats" in res.text

    def test_rate_limit_exceeded_raises_429(self, client, sample_image_bytes):
        with patch("app.check_free_tier_limits", return_value=(False, "Daily limit reached for today")):
            files = [("images", ("cat.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
            res = client.post("/api/grade", data={"age_confirmed": "true"}, files=files)
            assert res.status_code == 429
            assert "Daily limit reached" in res.text

    def test_successful_grading_with_mocked_gemini(self, client, sample_image_bytes, valid_loaf_analysis):
        # Create a mock Gemini API response containing valid JSON structured output
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "is_cat": True,
            "rejection_reason": None,
            "cat_name": "Mochi",
            "overall_score": 96,
            "grade_letter": "A+",
            "loaf_rank": "Grandmaster Artisan Loaf",
            "bread_classification": "Golden Brioche Loaf",
            "summary_critique": "Magnificent geometry with seamless peet concealment.",
            "paw_tuck": {"score": 25, "status": "Hidden", "critique": "Hidden", "observations": []},
            "tail_tuck": {"score": 24, "status": "Tucked", "critique": "Tucked", "observations": []},
            "elbow_compactness": {"score": 24, "status": "Tight", "critique": "Tight", "observations": []},
            "crust_symmetry": {"score": 23, "status": "Uniform", "critique": "Uniform", "observations": []},
            "drag_coefficient": 0.03,
            "oar_detected": False,
            "face_loaf": False,
            "multi_angle_bonus": 3,
            "badges": ["Stealth Peet"],
            "fun_tips_for_cat": ["Perfect rest"],
            "angle_notes": {"front": "Paws hidden"},
            "best_thumbnail_index": 0,
            "angle_classifications": ["front"]
        })

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response

        with patch("app.genai.Client", return_value=mock_client), \
             patch("app.check_free_tier_limits", return_value=(True, "")):
            
            files = [("images", ("mochi.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
            data = {"cat_name": "Mochi", "age_confirmed": "true"}
            res = client.post("/api/grade", data=data, files=files)
            
            assert res.status_code == 200
            json_res = res.json()
            assert "result" in json_res
            assert "grade_token" in json_res
            assert json_res["can_submit"] is True
            assert json_res["result"]["overall_score"] == 96
            assert json_res["result"]["cat_name"] == "Mochi"

            # Verify the issued grade token is valid and un-tampered
            token_payload = app.verify_grade_token(json_res["grade_token"])
            assert token_payload["overall_score"] == 96
            assert token_payload["can_submit"] is True

    def test_gemini_quota_exhausted_primary_falls_back_to_secondary(self, client, sample_image_bytes):
        # Primary key raises 429 quota exhausted, secondary key succeeds
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "is_cat": True,
            "rejection_reason": None,
            "cat_name": "Secondary Key Cat",
            "overall_score": 90,
            "grade_letter": "A",
            "loaf_rank": "Master Artisan Loaf",
            "bread_classification": "Brioche",
            "summary_critique": "Great form.",
            "paw_tuck": {"score": 23, "status": "Tucked", "critique": "", "observations": []},
            "tail_tuck": {"score": 23, "status": "Tucked", "critique": "", "observations": []},
            "elbow_compactness": {"score": 22, "status": "Tucked", "critique": "", "observations": []},
            "crust_symmetry": {"score": 22, "status": "Tucked", "critique": "", "observations": []},
            "drag_coefficient": 0.05,
            "oar_detected": False,
            "face_loaf": False,
            "multi_angle_bonus": 0,
            "badges": [],
            "fun_tips_for_cat": [],
            "angle_notes": {},
            "best_thumbnail_index": 0,
            "angle_classifications": ["front"]
        })

        client_1 = MagicMock()
        client_1.models.generate_content.side_effect = Exception("429 Resource Exhausted")
        client_2 = MagicMock()
        client_2.models.generate_content.return_value = mock_response

        call_count = 0
        def mock_get_client(api_key):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return client_1
            return client_2

        with patch("app.genai.Client", side_effect=mock_get_client), \
             patch("app.check_free_tier_limits", return_value=(True, "")), \
             patch("app.get_server_api_keys", return_value=["key1", "key2"]):
            
            files = [("images", ("cat.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
            res = client.post("/api/grade", data={"age_confirmed": "true"}, files=files)
            assert res.status_code == 200
            assert res.json()["result"]["cat_name"] == "Secondary Key Cat"
