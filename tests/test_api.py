import copy
import pytest
from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset the in-memory activities dict before and after each test."""
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(copy.deepcopy(original))


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Basic sanity check for known activities
    assert "Chess Club" in data


def test_root_redirect():
    # Do not follow redirects to assert the redirect status code
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code in (301, 302, 307, 308)


def test_signup_success_and_duplicate():
    activity = "Chess Club"
    email = "api_test@example.com"

    # Ensure clean start
    activities[activity]["participants"] = [p for p in activities[activity]["participants"] if p != email]

    r1 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r1.status_code == 200
    assert email in activities[activity]["participants"]

    # Duplicate signup should be rejected
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400


def test_signup_nonexistent_activity():
    r = client.post("/activities/Nonexistent/signup?email=foo@example.com")
    assert r.status_code == 404


def test_remove_participant_success_and_not_found():
    activity = "Tennis Club"
    email = "removeme@example.com"

    # Ensure participant exists
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    r = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r.status_code == 200
    assert email not in activities[activity]["participants"]

    # Removing again should return 404
    r2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r2.status_code == 404
