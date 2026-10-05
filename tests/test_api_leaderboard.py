import io
import json
import hashlib
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException
import app


class TestApiLeaderboard:
    """Tests the leaderboard submission, queries, loaf details, and moderation."""

    def test_submit_example_cat_with_can_submit_false_is_rejected(self, client, sample_image_bytes):
        data = {
            "cat_name": "Buttercup",
            "overall_score": 98,
            "grade_letter": "A+",
            "can_submit": False
        }
        token = app.generate_grade_token(data, can_submit=False)

        with patch("app.verify_cognito_token", return_value={"sub": "user_123", "email": "test@user.com"}):
            files = [("photos", ("buttercup.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
            form = {
                "grade_token": token,
                "cat_name": "Buttercup",
                "display_name": "BakerBob"
            }
            res = client.post("/api/leaderboard/submit", data=form, files=files, headers={"Authorization": "Bearer mock"})
            assert res.status_code == 400
            assert "Benchmark and example cats cannot be submitted" in res.text

    def test_submit_with_sample_image_hash_is_rejected(self, client):
        # Read the genuine benchmark Buttercup image file
        sample_path = Path("static/samples/buttercup_front.webp")
        real_buttercup_bytes = sample_path.read_bytes()
        real_hash = hashlib.sha256(real_buttercup_bytes).hexdigest()
        assert real_hash in app.SAMPLE_IMAGE_HASHES

        data = {
            "cat_name": "Copied Buttercup",
            "overall_score": 95,
            "grade_letter": "A",
            "can_submit": True,
            "image_sha256": real_hash,
            "image_hashes": [real_hash]
        }
        token = app.generate_grade_token(data, image_hash=real_hash, can_submit=True)

        with patch("app.verify_cognito_token", return_value={"sub": "user_123"}):
            files = [("photos", ("buttercup.webp", io.BytesIO(real_buttercup_bytes), "image/webp"))]
            form = {
                "grade_token": token,
                "cat_name": "Copied Buttercup",
                "display_name": "BakerBob"
            }
            res = client.post("/api/leaderboard/submit", data=form, files=files, headers={"Authorization": "Bearer mock"})
            assert res.status_code == 400
            assert "Benchmark and example cats cannot be submitted" in res.text

    def test_submit_with_tampered_token_rejected(self, client, sample_image_bytes):
        with patch("app.verify_cognito_token", return_value={"sub": "user_123"}):
            files = [("photos", ("photo.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
            form = {
                "grade_token": "tampered.token.here",
                "cat_name": "My Cat",
                "display_name": "BakerBob"
            }
            res = client.post("/api/leaderboard/submit", data=form, files=files, headers={"Authorization": "Bearer mock"})
            assert res.status_code == 400

    def test_successful_submit_to_leaderboard(self, client, sample_image_bytes):
        img_hash = hashlib.sha256(sample_image_bytes).hexdigest()
        data = {
            "cat_name": "Luna",
            "overall_score": 94,
            "grade_letter": "A+",
            "loaf_rank": "Grandmaster Artisan Loaf",
            "bread_classification": "Golden Brioche",
            "summary_critique": "Terrific posture.",
            "can_submit": True,
            "image_sha256": img_hash,
            "image_hashes": [img_hash]
        }
        token = app.generate_grade_token(data, image_hash=img_hash, can_submit=True)

        mock_s3 = MagicMock()
        mock_dynamo = MagicMock()
        mock_table = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.verify_cognito_token", return_value={"sub": "user_123", "name": "LunaMom"}), \
             patch("app.get_boto3_session") as mock_session:
            
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_s3
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            files = [("photos", ("luna.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
            form = {
                "grade_token": token,
                "cat_name": "Luna",
                "display_name": "LunaMom"
            }
            res = client.post("/api/leaderboard/submit", data=form, files=files, headers={"Authorization": "Bearer valid_token"})
            assert res.status_code == 200
            res_json = res.json()
            assert res_json["success"] is True
            assert "entry_id" in res_json
            assert res_json["cat_name"] == "Luna"
            assert res_json["score"] == 94

    def test_get_leaderboard_queries_dynamodb(self, client):
        mock_table = MagicMock()
        mock_table.query.return_value = {
            "Items": [
                {
                    "entry_id": "loaf_top1",
                    "cat_name": "Milo the Champion",
                    "display_name": "Head Baker",
                    "overall_score": 97,
                    "grade_letter": "A+",
                    "thumbnail_url": "/thumbnails/top1.webp"
                }
            ]
        }
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.get("/api/leaderboard?period=all")
            assert res.status_code == 200
            data = res.json()
            assert "entries" in data
            assert len(data["entries"]) == 1
            assert data["entries"][0]["cat_name"] == "Milo the Champion"
            assert data["entries"][0]["overall_score"] == 97

    def test_get_loaf_details_hall_of_fame_presets(self, client):
        # Preset entries should resolve gracefully
        for hof_id in ["hof_buttercup", "hof_flash", "hof_chonks"]:
            res = client.get(f"/api/loaf/{hof_id}")
            assert res.status_code == 200
            data = res.json()
            assert data["entry_id"] == hof_id
            assert "cat_name" in data
            assert data["overall_score"] > 80

    def test_get_loaf_details_nonexistent_returns_404(self, client):
        mock_table = MagicMock()
        mock_table.get_item.return_value = {"Item": None}
        mock_table.query.return_value = {"Items": []}
        mock_table.scan.return_value = {"Items": []}

        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.get("/api/loaf/nonexistent_loaf_99999")
            assert res.status_code == 404
            assert "not found" in res.text.lower()

    def test_report_entry(self, client):
        mock_table = MagicMock()
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/leaderboard/report", json={"entry_id": "loaf_test_123", "reason": "offensive"})
            assert res.status_code == 200
            assert res.json()["success"] is True

    def test_admin_remove_unauthorized(self, client):
        res = client.post("/api/admin/leaderboard/remove", json={"entry_id": "loaf_test_123", "admin_key": "wrong_secret"})
        assert res.status_code == 403
        assert "Unauthorized" in res.text

    def test_duplicate_submission_prevented(self, client, sample_image_bytes):
        img_hash = hashlib.sha256(sample_image_bytes).hexdigest()
        data = {
            "cat_name": "Luna",
            "overall_score": 94,
            "grade_letter": "A+",
            "can_submit": True,
            "image_sha256": img_hash,
            "image_hashes": [img_hash]
        }
        token = app.generate_grade_token(data, image_hash=img_hash, can_submit=True)

        mock_dynamo = MagicMock()
        mock_table = MagicMock()
        # Simulate that this user already submitted this image hash
        mock_table.get_item.return_value = {
            "Item": {
                "entry_id": "existing_123",
                "cat_name": "Luna",
                "overall_score": 94
            }
        }
        mock_dynamo.Table.return_value = mock_table

        with patch("app.verify_cognito_token", return_value={"sub": "user_123", "name": "LunaMom"}), \
             patch("app.get_boto3_session") as mock_session:

            mock_sess_inst = MagicMock()
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            files = [("photos", ("luna.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
            form = {
                "grade_token": token,
                "cat_name": "Luna",
                "display_name": "LunaMom"
            }
            res = client.post("/api/leaderboard/submit", data=form, files=files, headers={"Authorization": "Bearer valid_token"})
            assert res.status_code == 409
            res_json = res.json()
            assert res_json["already_submitted"] is True
            assert res_json["entry_id"] == "existing_123"
            assert "already been published" in res_json["detail"]

