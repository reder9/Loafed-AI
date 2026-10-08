from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError
from fastapi import HTTPException
from starlette.requests import Request

import app


class TestFreeTierLimits:
    """Tests shared, atomic DynamoDB quotas for server-funded Gemini requests."""

    def make_table(self, monkeypatch):
        table = MagicMock()
        session = MagicMock()
        session.resource.return_value.Table.return_value = table
        monkeypatch.setattr(app, "get_boto3_session", lambda: session)
        return table

    def test_custom_user_key_bypasses_shared_limits(self, monkeypatch):
        session = MagicMock()
        monkeypatch.setattr(app, "get_boto3_session", lambda: session)
        allowed, message = app.check_free_tier_limits("1.2.3.4", is_server_key=False)
        assert allowed is True
        assert message == ""
        session.resource.assert_not_called()

    def test_server_key_request_increments_shared_counters(self, monkeypatch):
        table = self.make_table(monkeypatch)
        allowed, message = app.check_free_tier_limits("1.2.3.4", is_server_key=True)
        assert allowed is True
        assert message == ""
        assert table.update_item.call_count == 2
        ip_update, daily_update = table.update_item.call_args_list
        assert ip_update.kwargs["Key"]["pk"].startswith("LIMIT#IP#")
        assert ip_update.kwargs["Key"]["sk"].startswith("CLIENT#")
        assert "#count < :limit" in ip_update.kwargs["ConditionExpression"]
        assert daily_update.kwargs["Key"]["pk"].startswith("LIMIT#DAILY#")
        assert "#count < :limit" in daily_update.kwargs["ConditionExpression"]

    def test_hourly_limit_blocks_without_incrementing_daily_total(self, monkeypatch):
        table = self.make_table(monkeypatch)
        table.update_item.side_effect = ClientError(
            {"Error": {"Code": "ConditionalCheckFailedException", "Message": "limit reached"}},
            "UpdateItem",
        )
        allowed, message = app.check_free_tier_limits("192.168.1.100", is_server_key=True)
        assert allowed is False
        assert "Rate limit reached" in message
        assert table.update_item.call_count == 1

    def test_daily_limit_is_enforced_atomically(self, monkeypatch):
        table = self.make_table(monkeypatch)
        table.update_item.side_effect = [None, ClientError(
            {"Error": {"Code": "ConditionalCheckFailedException", "Message": "limit reached"}},
            "UpdateItem",
        )]
        allowed, message = app.check_free_tier_limits("10.0.0.1", is_server_key=True)
        assert allowed is False
        assert "maximum capacity" in message
        assert table.update_item.call_count == 2

    def test_quota_storage_failure_fails_closed(self, monkeypatch):
        table = self.make_table(monkeypatch)
        table.update_item.side_effect = RuntimeError("DynamoDB unavailable")
        with pytest.raises(HTTPException) as exc:
            app.check_free_tier_limits("10.0.0.1", is_server_key=True)
        assert exc.value.status_code == 503

    def test_forwarded_ip_is_ignored_unless_trusted_proxy_is_enabled(self, monkeypatch):
        request = Request({
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [(b"x-forwarded-for", b"198.51.100.77, 203.0.113.5")],
            "client": ("192.0.2.10", 443),
            "server": ("loafed.test", 443),
            "scheme": "https",
        })

        monkeypatch.setattr(app, "TRUST_PROXY_HEADERS", False)
        assert app.get_client_ip(request) == "192.0.2.10"

        monkeypatch.setattr(app, "TRUST_PROXY_HEADERS", True)
        assert app.get_client_ip(request) == "203.0.113.5"
