from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError
import pytest
import app


class TestApiAuth:
    """Tests the Cognito-based authentication endpoints."""

    def test_auth_config_endpoint(self, client):
        res = client.get("/api/auth/config")
        assert res.status_code == 200
        data = res.json()
        assert "user_pool_id" in data
        assert "client_id" in data
        assert "domain" in data
        assert "region" in data

    def test_email_signin_missing_credentials(self, client):
        res = client.post("/api/auth/email/signin", json={"email": "", "password": ""})
        assert res.status_code == 400

    def test_email_signin_wrong_password_returns_401(self, client):
        mock_cognito = MagicMock()
        mock_cognito.initiate_auth.side_effect = ClientError(
            {"Error": {"Code": "NotAuthorizedException", "Message": "Incorrect username or password."}},
            "InitiateAuth"
        )

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/auth/email/signin", json={"email": "user@example.com", "password": "wrong"})
            assert res.status_code == 401
            assert "Incorrect email" in res.text

    def test_email_signin_unconfirmed_user_returns_403(self, client):
        mock_cognito = MagicMock()
        mock_cognito.initiate_auth.side_effect = ClientError(
            {"Error": {"Code": "UserNotConfirmedException", "Message": "User is not confirmed."}},
            "InitiateAuth"
        )

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/auth/email/signin", json={"email": "user@example.com", "password": "valid"})
            assert res.status_code == 403
            assert "USER_NOT_CONFIRMED" in res.text

    def test_email_signin_success(self, client):
        mock_cognito = MagicMock()
        mock_cognito.initiate_auth.return_value = {
            "AuthenticationResult": {
                "IdToken": "mock_id_token_123",
                "AccessToken": "mock_access_token_456",
                "RefreshToken": "mock_refresh_token_789",
                "ExpiresIn": 3600,
                "TokenType": "Bearer"
            }
        }

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/auth/email/signin", json={"email": "user@example.com", "password": "valid_password"})
            assert res.status_code == 200
            data = res.json()
            assert data["id_token"] == "mock_id_token_123"
            assert data["access_token"] == "mock_access_token_456"

    def test_email_signup_short_password_rejected(self, client):
        res = client.post("/api/auth/email/signup", json={
            "email": "user@example.com",
            "password": "123",
            "display_name": "BakerBob"
        })
        assert res.status_code == 400
        assert "at least 8 characters" in res.text

    def test_email_signup_invalid_display_name_rejected(self, client):
        res = client.post("/api/auth/email/signup", json={
            "email": "user@example.com",
            "password": "StrongPassword123!",
            "display_name": "<script>alert(1)</script>"
        })
        assert res.status_code == 400

    def test_email_signup_success(self, client):
        mock_cognito = MagicMock()
        mock_cognito.sign_up.return_value = {
            "UserConfirmed": False,
            "UserSub": "user_sub_uuid_456"
        }

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/auth/email/signup", json={
                "email": "baker@example.com",
                "password": "StrongPassword123!",
                "display_name": "BakerBob"
            })
            assert res.status_code == 200
            data = res.json()
            assert data["user_confirmed"] is False
            assert data["user_sub"] == "user_sub_uuid_456"

    def test_email_confirm_code_mismatch_returns_400(self, client):
        mock_cognito = MagicMock()
        mock_cognito.confirm_sign_up.side_effect = ClientError(
            {"Error": {"Code": "CodeMismatchException", "Message": "Invalid verification code"}},
            "ConfirmSignUp"
        )

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/auth/email/confirm", json={"email": "baker@example.com", "code": "000000"})
            assert res.status_code == 400
            assert "Invalid verification code" in res.text

    def test_email_confirm_success(self, client):
        mock_cognito = MagicMock()
        mock_cognito.confirm_sign_up.return_value = {}

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/auth/email/confirm", json={"email": "baker@example.com", "code": "123456"})
            assert res.status_code == 200
            assert res.json()["confirmed"] is True

    def test_resend_code_success(self, client):
        mock_cognito = MagicMock()
        mock_cognito.resend_confirmation_code.return_value = {}

        with patch("app.get_boto3_session") as mock_session:
            mock_sess_inst = MagicMock()
            mock_sess_inst.client.return_value = mock_cognito
            mock_session.return_value = mock_sess_inst

            res = client.post("/api/auth/email/resend-code", json={"email": "baker@example.com"})
            assert res.status_code == 200
            assert res.json()["status"] == "code_resent"
