import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import auth_header, create_mock_user

@pytest.fixture
def mock_httpx():
    with patch("services.instagram.httpx.AsyncClient") as mock:
        mock_instance = AsyncMock()
        mock.return_value.__aenter__.return_value = mock_instance
        yield mock_instance

@pytest.mark.asyncio
async def test_instagram_connect_success(client, mock_db_session, client_token, mock_httpx):
    mock_user = create_mock_user()
    
    # Setup mock DB responses
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db_session.execute.return_value = mock_result

    mock_httpx.post.side_effect = [
        MagicMock(status_code=200, json=lambda: {"access_token": "short_token"}),
        MagicMock(status_code=200, json=lambda: {"access_token": "long_token", "expires_in": 5184000})
    ]
    mock_httpx.get.return_value = MagicMock(status_code=200, json=lambda: {
        "data": [{"id": "p1", "name": "P1", "instagram_business_account": {"id": "ig1", "username": "iguser"}}]
    })

    response = await client.post(
        "/api/v1/account/instagram", 
        json={"code": "abc", "redirect_uri": "http://cb"},
        headers=auth_header(client_token)
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Assert persistence
    assert mock_user.instagram_access_token is not None
    assert mock_user.instagram_user_id == "ig1"

@pytest.mark.asyncio
async def test_instagram_connect_missing_business_account(client, mock_db_session, client_token, mock_httpx):
    mock_user = create_mock_user()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db_session.execute.return_value = mock_result

    mock_httpx.post.side_effect = [
        MagicMock(status_code=200, json=lambda: {"access_token": "short_token"}),
        MagicMock(status_code=200, json=lambda: {"access_token": "long_token", "expires_in": 5184000})
    ]
    mock_httpx.get.return_value = MagicMock(status_code=200, json=lambda: {"data": []})

    response = await client.post(
        "/api/v1/account/instagram", 
        json={"code": "abc", "redirect_uri": "http://cb"},
        headers=auth_header(client_token)
    )
    assert response.status_code == 422
    error = response.json()
    error_msg = error.get("error", {}).get("message", error.get("detail", ""))
    assert "No Instagram Business Account found" in error_msg

@pytest.mark.asyncio
async def test_instagram_connect_oauth_failure(client, mock_db_session, client_token, mock_httpx):
    mock_user = create_mock_user()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db_session.execute.return_value = mock_result

    import httpx
    error_mock = MagicMock(status_code=400)
    request_mock = MagicMock()
    error_mock.raise_for_status.side_effect = httpx.HTTPStatusError("Invalid code", request=request_mock, response=error_mock)
    mock_httpx.post.return_value = error_mock

    response = await client.post(
        "/api/v1/account/instagram", 
        json={"code": "invalid", "redirect_uri": "http://cb"},
        headers=auth_header(client_token)
    )
    assert response.status_code == 422
    error = response.json()
    error_msg = error.get("error", {}).get("message", error.get("detail", ""))
    assert "Invalid or expired Instagram OAuth code" in error_msg

@pytest.mark.asyncio
async def test_instagram_disconnect(client, mock_db_session, client_token):
    mock_user = create_mock_user()
    mock_user.instagram_access_token = "encrypted_token"
    mock_user.instagram_user_id = "ig1"
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db_session.execute.return_value = mock_result

    response = await client.delete(
        "/api/v1/account/instagram",
        headers=auth_header(client_token)
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    assert mock_user.instagram_access_token is None
    assert mock_user.instagram_user_id is None
