import json
import time
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm
import app


class TestCognitoJwtVerification:
    """Tests the cryptographic RS256 JWT decoding and JWKS caching for Cognito."""

    @pytest.fixture(scope="class")
    @classmethod
    def rsa_keypair(cls):
        priv_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        pub_key = priv_key.public_key()
        jwk = json.loads(RSAAlgorithm.to_jwk(pub_key))
        jwk["kid"] = "mock_key_id_999"
        return priv_key, jwk

    def test_missing_or_malformed_auth_header_raises_401(self):
        for bad_header in [None, "", "Basic 12345", "Bearer", "Token xyz"]:
            with pytest.raises(HTTPException) as exc_info:
                app.verify_cognito_token(bad_header)
            assert exc_info.value.status_code == 401

    def test_valid_rs256_token_verifies_successfully(self, rsa_keypair):
        priv_key, jwk = rsa_keypair
        headers = {"kid": jwk["kid"]}
        claims = {
            "sub": "user_verified_uuid",
            "iss": f"https://cognito-idp.{app.AWS_REGION}.amazonaws.com/{app.COGNITO_USER_POOL_ID}",
            "client_id": app.COGNITO_CLIENT_ID,
            "email": "verified@loafed.com",
            "exp": int(time.time()) + 3600
        }
        token = jwt.encode(claims, priv_key, algorithm="RS256", headers=headers)

        # Mock get_cognito_jwks to return our JWK
        with patch("app.get_cognito_jwks", return_value={"keys": [jwk]}):
            verified_claims = app.verify_cognito_token(f"Bearer {token}")
            assert verified_claims["sub"] == "user_verified_uuid"
            assert verified_claims["email"] == "verified@loafed.com"

    def test_token_with_wrong_issuer_raises_401(self, rsa_keypair):
        priv_key, jwk = rsa_keypair
        headers = {"kid": jwk["kid"]}
        claims = {
            "sub": "user_verified_uuid",
            "iss": "https://attacker-issuer.com/fake_pool",
            "client_id": app.COGNITO_CLIENT_ID,
            "exp": int(time.time()) + 3600
        }
        token = jwt.encode(claims, priv_key, algorithm="RS256", headers=headers)

        with patch("app.get_cognito_jwks", return_value={"keys": [jwk]}):
            with pytest.raises(HTTPException) as exc_info:
                app.verify_cognito_token(f"Bearer {token}")
            assert exc_info.value.status_code == 401
            assert "issuer" in exc_info.value.detail.lower()

    def test_token_with_wrong_client_id_raises_401(self, rsa_keypair):
        priv_key, jwk = rsa_keypair
        headers = {"kid": jwk["kid"]}
        claims = {
            "sub": "user_verified_uuid",
            "iss": f"https://cognito-idp.{app.AWS_REGION}.amazonaws.com/{app.COGNITO_USER_POOL_ID}",
            "client_id": "different_unauthorized_app_id",
            "exp": int(time.time()) + 3600
        }
        token = jwt.encode(claims, priv_key, algorithm="RS256", headers=headers)

        with patch("app.get_cognito_jwks", return_value={"keys": [jwk]}):
            with pytest.raises(HTTPException) as exc_info:
                app.verify_cognito_token(f"Bearer {token}")
            assert exc_info.value.status_code == 401
            assert "client" in exc_info.value.detail.lower()

    def test_token_missing_kid_header_raises_401(self, rsa_keypair):
        priv_key, _ = rsa_keypair
        # No kid in header
        token = jwt.encode({"sub": "user_123"}, priv_key, algorithm="RS256")
        with pytest.raises(HTTPException) as exc_info:
            app.verify_cognito_token(f"Bearer {token}")
        assert exc_info.value.status_code == 401

    def test_get_cognito_jwks_uses_cache_within_ttl(self):
        app.COGNITO_JWKS_CACHE["keys"] = {"keys": [{"kid": "cached_kid"}]}
        app.COGNITO_JWKS_CACHE["fetched_at"] = time.time() - 100  # < 3600s

        # Should return cached without network call
        jwks = app.get_cognito_jwks()
        assert jwks["keys"][0]["kid"] == "cached_kid"
