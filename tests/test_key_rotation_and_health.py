import time
import pytest
import app


class TestApiKeyRotation:
    """Tests multi-key configuration parsing, cooldown tracking, and fallback ordering."""

    def test_single_and_secondary_key_detection(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "primary_key_aaa")
        monkeypatch.setenv("GEMINI_API_KEY_SECONDARY", "secondary_key_bbb")
        monkeypatch.delenv("GEMINI_API_KEYS", raising=False)

        keys = app.get_server_api_keys()
        assert keys == ["primary_key_aaa", "secondary_key_bbb"]

    def test_comma_separated_keys(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "key_1, key_2 , key_3")
        monkeypatch.delenv("GEMINI_API_KEY_SECONDARY", raising=False)
        monkeypatch.delenv("GEMINI_API_KEYS", raising=False)

        keys = app.get_server_api_keys()
        assert keys == ["key_1", "key_2", "key_3"]

    def test_json_array_in_gemini_api_keys(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEYS", '["json_key_1", "json_key_2"]')
        monkeypatch.setenv("GEMINI_API_KEY", "single_fallback")
        monkeypatch.delenv("GEMINI_API_KEY_SECONDARY", raising=False)

        keys = app.get_server_api_keys()
        assert keys == ["json_key_1", "json_key_2", "single_fallback"]

    def test_deduplication_of_identical_keys(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "same_key")
        monkeypatch.setenv("GEMINI_API_KEY_SECONDARY", "same_key")

        keys = app.get_server_api_keys()
        assert keys == ["same_key"]

    def test_custom_key_takes_absolute_precedence(self):
        ordered = app.get_ordered_api_keys(custom_key="user_provided_key")
        assert ordered == ["user_provided_key"]

    def test_healthy_keys_prioritized_over_cooldown(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "key_primary_12345678")
        monkeypatch.setenv("GEMINI_API_KEY_SECONDARY", "key_secondary_87654321")

        # Put primary key on 429 cooldown for 60 seconds
        kid_primary = "12345678"
        app.key_exhaustion_tracker[kid_primary] = time.time() + 60

        ordered = app.get_ordered_api_keys()
        # Secondary healthy key should now be first!
        assert ordered[0] == "key_secondary_87654321"
        assert ordered[1] == "key_primary_12345678"

        # Cleanup tracker
        app.key_exhaustion_tracker.pop(kid_primary, None)

    def test_expired_cooldown_restores_health(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "key_primary_12345678")
        monkeypatch.setenv("GEMINI_API_KEY_SECONDARY", "key_secondary_87654321")

        kid_primary = "12345678"
        # Cooldown expired 10 seconds ago
        app.key_exhaustion_tracker[kid_primary] = time.time() - 10

        ordered = app.get_ordered_api_keys()
        # Primary should be healthy and first again
        assert ordered[0] == "key_primary_12345678"

        # Cleanup tracker
        app.key_exhaustion_tracker.pop(kid_primary, None)
