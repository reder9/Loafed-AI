import time
from datetime import datetime, timezone
import pytest
import app


class TestFreeTierLimits:
    """Tests the in-memory anti-spam and daily capacity rate limiter."""

    def setup_method(self):
        # Reset tracker before each test
        app.daily_counter["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        app.daily_counter["count"] = 0
        app.ip_history.clear()

    def test_custom_user_key_bypasses_limits(self):
        allowed, msg = app.check_free_tier_limits("1.2.3.4", is_server_key=False)
        assert allowed is True
        assert msg == ""

    def test_normal_server_key_request_increments_counter(self):
        allowed, msg = app.check_free_tier_limits("1.2.3.4", is_server_key=True)
        assert allowed is True
        assert app.daily_counter["count"] == 1
        assert len(app.ip_history["1.2.3.4"]) == 1

    def test_ip_hourly_limit_exceeded(self):
        # Simulate reaching the hourly cap
        client_ip = "192.168.1.100"
        now = time.time()
        app.ip_history[client_ip] = [now - 100] * app.IP_HOURLY_LIMIT

        allowed, msg = app.check_free_tier_limits(client_ip, is_server_key=True)
        assert allowed is False
        assert "Rate limit reached" in msg

    def test_daily_global_cap_exceeded(self):
        # Simulate reaching global daily cap
        app.daily_counter["count"] = app.DAILY_MAX_LOAVES

        allowed, msg = app.check_free_tier_limits("10.0.0.1", is_server_key=True)
        assert allowed is False
        assert "maximum capacity" in msg

    def test_new_utc_day_resets_counters(self):
        app.daily_counter["date"] = "2020-01-01"  # Old day
        app.daily_counter["count"] = 999
        app.ip_history["some_ip"] = [time.time()]

        allowed, msg = app.check_free_tier_limits("some_ip", is_server_key=True)
        assert allowed is True
        # Counter should have reset to 1 (for current request)
        assert app.daily_counter["count"] == 1
