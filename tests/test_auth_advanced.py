import io
import json
import time
from unittest.mock import MagicMock, patch
import pytest
from botocore.exceptions import ClientError
import app


class TestAuthAdvanced:
    """Tests token exchange, password reset, notifications, admin purges, and account deletion."""

    def test_token_exchange_success(self, client):
        mock_response_data = {
            "access_token": "mock_access_tok",
            "id_token": "mock_id_tok",
            "refresh_token": "mock_refresh_tok",
            "expires_in": 3600,
            "token_type": "Bearer"
        }

        mock_resp_obj = MagicMock()
        mock_resp_obj.read.return_value = json.dumps(mock_response_data).encode("utf-8")
        mock_resp_obj.__enter__.return_value = mock_resp_obj

        with patch("urllib.request.urlopen", return_value=mock_resp_obj), \
             patch("app.send_google_signin_notification") as mock_notify:
            
            res = client.post("/api/auth/token", json={
                "code": "auth_code_xyz",
                "redirect_uri": "https://loafed.redersoft.com"
            })
            assert res.status_code == 200
            data = res.json()
            assert data["access_token"] == "mock_access_tok"

    def test_forgot_password_user_not_found_returns_privacy_safe_response(self, client):
        mock_cognito = MagicMock()
        mock_cognito.forgot_password.side_effect = ClientError(
            {"Error": {"Code": "UserNotFoundException", "Message": "User not found"}},
            "ForgotPassword"
        )

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/auth/email/forgot-password", json={"email": "nonexistent@example.com"})
            assert res.status_code == 200
            assert res.json()["status"] == "reset_code_sent"
            assert "If an account exists" in res.json()["message"]

    def test_confirm_forgot_password_success(self, client):
        mock_cognito = MagicMock()
        mock_cognito.confirm_forgot_password.return_value = {}

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/auth/email/confirm-forgot-password", json={
                "email": "user@example.com",
                "code": "123456",
                "new_password": "NewStrongPassword123!"
            })
            assert res.status_code == 200
            assert res.json()["reset"] is True

    def test_admin_remove_success(self, client):
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            "Item": {
                "entry_id": "loaf_purge_1",
                "overall_score": 85,
                "periods": ["ALL", "2026-10"]
            }
        }
        mock_s3 = MagicMock()
        mock_s3.list_objects_v2.return_value = {"Contents": [{"Key": "thumbnails/loaf_purge_1.webp"}]}

        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_s3
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/admin/leaderboard/remove", json={
                "entry_id": "loaf_purge_1",
                "admin_key": app.SIGNATURE_SECRET,
                "score": 85
            })
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["purged_id"] == "loaf_purge_1"
            assert mock_table.delete_item.call_count >= 2

    def test_delete_user_account_success(self, client):
        mock_claims = {"sub": "user_delete_123", "cognito:username": "test_baker"}

        mock_table = MagicMock()
        mock_table.query.return_value = {
            "Items": [
                {
                    "entry_id": "loaf_user_del_1",
                    "overall_score": 91,
                    "periods": ["ALL"]
                }
            ]
        }
        mock_s3 = MagicMock()
        mock_cognito = MagicMock()

        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table

        with patch("app.verify_cognito_token", return_value=mock_claims), \
             patch("app.get_boto3_session") as mock_session:
            
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.side_effect = lambda service, **kwargs: mock_s3 if service == "s3" else mock_cognito
            mock_sess_inst.resource.return_value = mock_dynamo
            mock_session.return_value = mock_sess_inst

            res = client.delete("/api/user/account", headers={"Authorization": "Bearer mock_jwt"})
            assert res.status_code == 200
            assert res.json()["success"] is True
            mock_cognito.admin_delete_user.assert_called_once()
            mock_table.delete_item.assert_called_once()

    def test_send_google_signin_notification_with_valid_token(self):
        # Create unverified mock JWT with Google identity
        import jwt
        claims = {
            "email": "baker@redersoft.com",
            "name": "BakerBob",
            "identities": [{"providerName": "Google"}]
        }
        token = jwt.encode(claims, "secret32charstolongenoughforjwtsecret", algorithm="HS256")

        mock_ses = MagicMock()
        mock_ses.send_email.return_value = {"MessageId": "ses_msg_123"}

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_ses
            mock_session.return_value = mock_sess_inst

            app.send_google_signin_notification(token)
            mock_ses.send_email.assert_called_once()

        # Second immediate call should be throttled by rate limit cache
        mock_ses.reset_mock()
        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_ses
            mock_session.return_value = mock_sess_inst

            app.send_google_signin_notification(token)
            mock_ses.send_email.assert_not_called()
