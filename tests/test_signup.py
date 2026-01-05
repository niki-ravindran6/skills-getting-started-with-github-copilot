from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_duplicate_signup():
    activity = "Chess Club"
    email = "newstudent@example.com"

    # Ensure email not present initially
    activities[activity]["participants"] = [p for p in activities[activity]["participants"] if p != email]

    r1 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r1.status_code == 200
    assert email in activities[activity]["participants"]

    # Second signup should fail
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400


def test_remove_participant():
    activity = "Tennis Club"
    email = "tempstudent@example.com"

    # Ensure the participant exists
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    r = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r.status_code == 200
    assert email not in activities[activity]["participants"]

    # Removing again should return 404
    r2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r2.status_code == 404
