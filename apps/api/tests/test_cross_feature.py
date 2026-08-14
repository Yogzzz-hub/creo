import pytest
from unittest.mock import MagicMock, patch

from tests.conftest import auth_header, create_mock_user

@pytest.mark.asyncio
async def test_instagram_disconnect_preserves_auth(client, mock_db_session, client_token):
    mock_user = create_mock_user()
    mock_user.instagram_access_token = "encrypted_token"
    mock_user.instagram_user_id = "ig1"
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db_session.execute.return_value = mock_result

    # Disconnect Instagram
    response = await client.delete(
        "/api/v1/account/instagram", 
        headers=auth_header(client_token)
    )
    assert response.status_code == 200

    # Ensure auth is still valid
    profile = await client.get("/api/v1/account", headers=auth_header(client_token))
    assert profile.status_code == 200
    assert profile.json()["instagram_connected"] is False
    assert profile.json()["email"] == mock_user.email

@pytest.mark.asyncio
async def test_instagram_failure_does_not_affect_auth(client, mock_db_session, client_token):
    mock_user = create_mock_user()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db_session.execute.return_value = mock_result

    with patch("routers.account.exchange_instagram_token") as mock_exchange:
        mock_exchange.side_effect = Exception("Meta API Down")
        
        response = await client.post(
            "/api/v1/account/instagram", 
            json={"code": "abc", "redirect_uri": "http://cb"},
            headers=auth_header(client_token)
        )
        assert response.status_code == 502

    # Make sure user is still authenticated and we can hit a protected route
    profile_response = await client.get("/api/v1/account", headers=auth_header(client_token))
    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == mock_user.email
