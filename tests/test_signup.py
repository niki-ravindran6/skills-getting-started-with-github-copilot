from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_duplicate_signup_returns_400():
    activity = "Chess Club"
    email = "michael@mergington.edu"

    # Ensure the email is already signed up
    assert email in activities[activity]["participants"]
    before_count = activities[activity]["participants"].count(email)

    response = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert response.status_code == 400
    assert "already" in response.json().get("detail", "")

    # Ensure the participant list was not duplicated
    after_count = activities[activity]["participants"].count(email)
    assert after_count == before_count
