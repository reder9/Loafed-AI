from unittest.mock import MagicMock, patch
import pytest
import app


class TestApiUserProfile:
    """Tests user profile retrieval, name updating, entry management, and account deletion."""

    def test_get_user_profile_success(self, client):
        mock_claims = {
            "sub": "user_abc_123",
            "email": "baker@loafed.com",
            "name": "Chef Croissant",
            "cognito:username": "baker_user"
        }

        with patch("app.verify_cognito_token", return_value=mock_claims):
            res = client.get("/api/user/profile", headers={"Authorization": "Bearer mock_token"})
            assert res.status_code == 200
            data = res.json()
            assert data["user_id"] == "user_abc_123"
            assert data["email"] == "baker@loafed.com"
            assert data["display_name"] == "Chef Croissant"
            assert data["auth_provider"] == "Email & Password"

    def test_update_user_profile_valid_name(self, client):
        mock_claims = {
            "sub": "user_abc_123",
            "email": "baker@loafed.com",
            "cognito:username": "user_abc_123"
        }

        mock_cognito = MagicMock()
        mock_table = MagicMock()
        mock_table.query.return_value = {"Items": []}  # No past entries to update

        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.verify_cognito_token", return_value=mock_claims), \
             patch("app.get_boto3_session") as mock_session:
            
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.patch(
                "/api/user/profile",
                json={"display_name": "Baker supreme"},
                headers={"Authorization": "Bearer mock_token"}
            )
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["display_name"] == "Baker supreme"
            mock_cognito.admin_update_user_attributes.assert_called_once()

    def test_update_user_profile_profane_name_rejected(self, client):
        mock_claims = {"sub": "user_abc_123", "email": "baker@loafed.com"}

        with patch("app.verify_cognito_token", return_value=mock_claims):
            res = client.patch(
                "/api/user/profile",
                json={"display_name": "FuckBaker"},
                headers={"Authorization": "Bearer mock_token"}
            )
            assert res.status_code == 400
            assert "inappropriate" in res.text.lower()

    def test_get_my_entries(self, client):
        mock_claims = {"sub": "user_abc_123"}
        mock_table = MagicMock()
        mock_table.query.return_value = {
            "Items": [
                {
                    "entry_id": "loaf_user_1",
                    "cat_name": "Milo",
                    "overall_score": 93,
                    "grade_letter": "A",
                    "thumbnail_url": "/thumbs/milo.webp"
                }
            ]
        }
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.verify_cognito_token", return_value=mock_claims), \
             patch("app.get_boto3_session") as mock_session:
            
            mock_sess_inst = MagicMock()
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.get("/api/leaderboard/my-entries", headers={"Authorization": "Bearer mock"})
            assert res.status_code == 200
            data = res.json()
            assert "entries" in data
            assert len(data["entries"]) == 1
            assert data["entries"][0]["cat_name"] == "Milo"

    def test_delete_own_entry_success(self, client):
        mock_claims = {"sub": "user_abc_123"}
        mock_table = MagicMock()
        mock_table.query.return_value = {
            "Items": [
                {
                    "entry_id": "loaf_to_delete",
                    "user_id": "user_abc_123",
                    "overall_score": 90,
                    "periods": ["ALL"]
                }
            ]
        }
        mock_s3 = MagicMock()
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.verify_cognito_token", return_value=mock_claims), \
             patch("app.get_boto3_session") as mock_session:
            
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_s3
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.delete("/api/leaderboard/entry/loaf_to_delete", headers={"Authorization": "Bearer mock"})
            assert res.status_code == 200
            assert res.json()["success"] is True
            assert res.json()["deleted_id"] == "loaf_to_delete"

    def test_delete_other_user_entry_returns_404(self, client):
        mock_claims = {"sub": "user_abc_123"}
        mock_table = MagicMock()
        # Query returns no entries owned by user_abc_123 matching that entry_id
        mock_table.query.return_value = {"Items": []}
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.verify_cognito_token", return_value=mock_claims), \
             patch("app.get_boto3_session") as mock_session:
            
            mock_sess_inst = MagicMock()
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.delete("/api/leaderboard/entry/someone_elses_loaf", headers={"Authorization": "Bearer mock"})
            assert res.status_code == 404
