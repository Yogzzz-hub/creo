import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.instagram import exchange_instagram_token

@pytest.fixture
def mock_httpx_client():
    mock_client = AsyncMock()
    mock_post_response = MagicMock()
    mock_post_response.status_code = 200
    mock_post_response.json.return_value = {"access_token": "mocked_short_token"}
    mock_client.post.return_value = mock_post_response

    mock_get_response = MagicMock()
    mock_get_response.status_code = 200
    mock_get_response.json.return_value = {
        "data": [
            {
                "id": "page_1",
                "name": "Test Page",
                "instagram_business_account": {
                    "id": "ig_12345",
                    "username": "testig"
                }
            }
        ]
    }
    mock_client.get.return_value = mock_get_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False
    return mock_client

@pytest.mark.asyncio
async def test_exchange_instagram_token_success(mock_httpx_client):
    mock_httpx_client.post.side_effect = [
        MagicMock(status_code=200, json=lambda: {"access_token": "short_token"}),
        MagicMock(status_code=200, json=lambda: {"access_token": "long_token", "expires_in": 5184000})
    ]

    with patch("httpx.AsyncClient", return_value=mock_httpx_client):
        result = await exchange_instagram_token("testcode", "http://localhost/cb")

        assert result["access_token"] == "long_token"
        assert result["instagram_user_id"] == "ig_12345"
        assert result["instagram_username"] == "testig"
        assert result["expires_in"] == 5184000

@pytest.mark.asyncio
async def test_exchange_instagram_token_missing_ig_account(mock_httpx_client):
    mock_httpx_client.post.side_effect = [
        MagicMock(status_code=200, json=lambda: {"access_token": "short_token"}),
        MagicMock(status_code=200, json=lambda: {"access_token": "long_token", "expires_in": 5184000})
    ]
    mock_httpx_client.get.return_value = MagicMock(
        status_code=200, 
        json=lambda: {"data": [{"id": "page_1", "name": "No IG Page"}]}
    )

    with patch("httpx.AsyncClient", return_value=mock_httpx_client):
        result = await exchange_instagram_token("testcode", "http://localhost/cb")

        assert result["access_token"] == "long_token"
        assert result["instagram_user_id"] is None
        assert result["instagram_username"] is None
        assert result["expires_in"] == 5184000

@pytest.mark.asyncio
async def test_exchange_instagram_token_api_error(mock_httpx_client):
    error_mock = MagicMock(status_code=400)
    error_mock.raise_for_status.side_effect = Exception("API Error")
    mock_httpx_client.post.return_value = error_mock

    with patch("httpx.AsyncClient", return_value=mock_httpx_client):
        with pytest.raises(Exception):
            await exchange_instagram_token("testcode", "http://localhost/cb")
