import pytest


def test_health_check_endpoints(client):
    res1 = client.get("/health")
    assert res1.status_code == 200
    assert res1.json() == {"status": "ok"}

    res2 = client.get("/api/health")
    assert res2.status_code == 200
    assert res2.json() == {"status": "ok"}


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
    assert "buttercup" in data
    assert "chonks" in data
    assert "flash" in data

    # Verify Buttercup preset structure
    buttercup = data["buttercup"]
    assert buttercup["name"] == "Buttercup"
    assert "front" in buttercup["images"]
    assert "side" in buttercup["images"]
    assert "top" in buttercup["images"]
    assert buttercup["cached_analysis"]["overall_score"] == 98
    assert buttercup["cached_analysis"]["grade_letter"] == "A+"


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
