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
        # Read the genuine benchmark Flash image file
        sample_path = Path("static/samples/flash_92_front.webp")
        real_benchmark_bytes = sample_path.read_bytes()
        real_hash = hashlib.sha256(real_benchmark_bytes).hexdigest()
        assert real_hash in app.SAMPLE_IMAGE_HASHES

        data = {
            "cat_name": "Copied Flash",
            "overall_score": 92,
            "grade_letter": "A",
            "can_submit": True,
            "image_sha256": real_hash,
            "image_hashes": [real_hash]
        }
        token = app.generate_grade_token(data, image_hash=real_hash, can_submit=True)

        with patch("app.verify_cognito_token", return_value={"sub": "user_123", "name": "BakerBob"}):
            files = [("photos", ("flash.webp", io.BytesIO(real_benchmark_bytes), "image/webp"))]
            form = {
                "grade_token": token,
                "cat_name": "Copied Flash",
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

    def test_submit_ignores_form_display_name_when_profile_name_in_token(self, client, sample_image_bytes):
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

        with patch("app.verify_cognito_token", return_value={"sub": "user_123", "name": "ProfileBaker"}), \
             patch("app.get_boto3_session") as mock_session:

            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_s3
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            files = [("photos", ("luna.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
            form = {
                "grade_token": token,
                "cat_name": "Luna",
                "display_name": "RerolledTag"
            }
            res = client.post("/api/leaderboard/submit", data=form, files=files, headers={"Authorization": "Bearer valid_token"})
            assert res.status_code == 200
            put_calls = mock_table.put_item.call_args_list
            assert put_calls
            first_item = put_calls[0].kwargs.get("Item") or put_calls[0][1].get("Item")
            assert first_item["display_name"] == "ProfileBaker"

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
            assert data["overall_score"] >= 70

    def test_public_loaf_details_do_not_expose_account_identifier(self, client):
        mock_table = MagicMock()
        mock_table.get_item.return_value = {"Item": {
            "entry_id": "public_entry_123",
            "user_id": "private_cognito_subject",
            "cat_name": "Milo",
            "display_name": "Baker",
            "overall_score": 80,
            "grade_letter": "B",
            "periods": ["ALL"],
            "thumbnail_url": "https://example.test/photo.webp",
        }}
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.get("/api/loaf/public_entry_123")

        assert res.status_code == 200
        assert "user_id" not in res.json()

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
        mock_table.query.return_value = {
            "Items": [{
                "entry_id": "loaf_test_123",
                "overall_score": 85,
                "periods": ["ALL", "2026-10", "2026-W41"],
                "report_count": 2,
                "is_hidden": False
            }]
        }
        mock_table.get_item.return_value = {"Item": {"report_count": 3, "is_hidden": False}}
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/leaderboard/report", json={"entry_id": "loaf_test_123", "reason": "offensive"})
            assert res.status_code == 200
            assert res.json()["success"] is True
            assert res.json()["is_hidden"] is True
            assert res.json()["already_reported"] is False

        transaction = mock_table.meta.client.transact_write_items.call_args.kwargs["TransactItems"]
        assert len(transaction) == 5  # One dedupe marker plus all-time, month, week, and metadata rows.
        assert transaction[0]["Put"]["ConditionExpression"] == "attribute_not_exists(pk)"
        update_keys = [call.kwargs["Key"] for call in mock_table.update_item.call_args_list]
        assert {"pk": "ENTRY#loaf_test_123", "sk": "METADATA"} in update_keys
        assert len(update_keys) == 4

    def test_duplicate_report_does_not_increment_count_again(self, client):
        from botocore.exceptions import ClientError

        mock_table = MagicMock()
        mock_table.query.return_value = {"Items": [{
            "entry_id": "loaf_test_123",
            "overall_score": 85,
            "periods": ["ALL"],
            "report_count": 3,
            "is_hidden": True,
        }]}
        mock_table.meta.client.transact_write_items.side_effect = ClientError(
            {"Error": {"Code": "TransactionCanceledException", "Message": "conditional check failed"}},
            "TransactWriteItems",
        )
        mock_table.get_item.side_effect = [
            {"Item": {"pk": "REPORT#loaf_test_123", "sk": "REPORTER#hashed"}},
            {"Item": {"report_count": 3, "is_hidden": True}},
        ]
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst
            res = client.post("/api/leaderboard/report", json={"entry_id": "loaf_test_123"})

        assert res.status_code == 200
        assert res.json()["already_reported"] is True
        assert res.json()["report_count"] == 3
        mock_table.update_item.assert_not_called()

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

    def test_successful_submit_to_leaderboard_decimal_score(self, client, sample_image_bytes):
        img_hash = hashlib.sha256(sample_image_bytes).hexdigest()
        data = {
            "cat_name": "Oliver",
            "overall_score": 92.24,
            "grade_letter": "A",
            "loaf_rank": "Grandmaster Artisan Loaf",
            "bread_classification": "Golden Brioche",
            "summary_critique": "Terrific posture with precision curvature.",
            "can_submit": True,
            "image_sha256": img_hash,
            "image_hashes": [img_hash]
        }
        token = app.generate_grade_token(data, image_hash=img_hash, can_submit=True)

        mock_s3 = MagicMock()
        mock_dynamo = MagicMock()
        mock_table = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.verify_cognito_token", return_value={"sub": "user_456", "name": "OliverDad"}), \
             patch("app.get_boto3_session") as mock_session:

            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_s3
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            files = [("photos", ("oliver.jpg", io.BytesIO(sample_image_bytes), "image/jpeg"))]
            form = {
                "grade_token": token,
                "cat_name": "Oliver",
                "display_name": "OliverDad"
            }
            res = client.post("/api/leaderboard/submit", data=form, files=files, headers={"Authorization": "Bearer valid_token"})
            assert res.status_code == 200
            res_json = res.json()
            assert res_json["success"] is True
            assert res_json["score"] == 92.24

            # Verify DynamoDB put_item was called with decimal-formatted sk
            put_calls = mock_table.put_item.call_args_list
            assert len(put_calls) > 0
            # Check PERIOD#ALL item's sk
            all_time_put = [call for call in put_calls if call.kwargs.get("Item", {}).get("pk") == "PERIOD#ALL"]
            assert len(all_time_put) == 1
            sk = all_time_put[0].kwargs["Item"]["sk"]
            assert sk.startswith("SCORE#092.24#")

