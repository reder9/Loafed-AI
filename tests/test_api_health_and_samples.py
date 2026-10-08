import pytest


def test_health_check_endpoints(client):
    res1 = client.get("/health")
    assert res1.status_code == 200
    assert res1.json() == {"status": "ok"}
    assert res1.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in res1.headers["content-security-policy"]
    assert "default-src 'self'" in res1.headers["content-security-policy"]
    assert "script-src 'self';" in res1.headers["content-security-policy"]
    assert res1.headers["x-content-type-options"] == "nosniff"

    res2 = client.get("/api/health")
    assert res2.status_code == 200
    assert res2.json() == {"status": "ok"}


def test_cors_allows_app_origin_without_credentialed_wildcards(client):
    res = client.options("/api/health", headers={
        "Origin": "https://loafed.redersoft.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,x-gemini-api-key",
    })

    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == "https://loafed.redersoft.com"
    assert res.headers.get("access-control-allow-credentials") != "true"
    assert "POST" in res.headers["access-control-allow-methods"]


def test_status_endpoint(client):
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert "has_server_api_key" in data
    assert data["has_server_api_key"] is True
    assert "key_pool_size" in data
    assert data["key_pool_size"] >= 1
    assert "default_model" in data


def test_samples_endpoint(client):
    res = client.get("/api/samples")
    assert res.status_code == 200
    data = res.json()
    assert "flash" in data
    assert "chonks_79" in data
    assert "chonks_68" in data

    # Verify Flash preset structure
    flash = data["flash"]
    assert flash["name"] == "Flash"
    assert "front" in flash["images"]
    assert flash["cached_analysis"]["overall_score"] == 92
    assert flash["cached_analysis"]["grade_letter"] == "A"


def test_robots_and_sitemap(client):
    res_robots = client.get("/robots.txt")
    assert res_robots.status_code == 200
    assert "User-agent:" in res_robots.text

    res_sitemap = client.get("/sitemap.xml")
    assert res_sitemap.status_code == 200
    assert "urlset" in res_sitemap.text


def test_page_routes(client):
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "text/html" in res_root.headers.get("content-type", "")

    res_leaderboard = client.get("/leaderboard")
    assert res_leaderboard.status_code == 200
    assert "text/html" in res_leaderboard.headers.get("content-type", "")

    res_loaf = client.get("/loaf")
    assert res_loaf.status_code == 200
    assert "text/html" in res_loaf.headers.get("content-type", "")

    res_terms = client.get("/terms.html")
    assert res_terms.status_code == 200
    assert "professional or business purposes, not consumer use" in res_terms.text

    res_privacy = client.get("/privacy.html")
    assert res_privacy.status_code == 200
    assert "unpaid-service content may be used" in res_privacy.text

    res_terms_alias = client.get("/terms")
    assert res_terms_alias.status_code == 200
    res_privacy_alias = client.get("/privacy")
    assert res_privacy_alias.status_code == 200

    assert "/static/site-bootstrap.js" in res_root.text
