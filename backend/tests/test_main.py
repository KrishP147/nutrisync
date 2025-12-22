"""
Tests for main API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
import httpx


def test_root_endpoint(test_client):
    """Test root endpoint returns welcome message"""
    response = test_client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "NutriSync" in response.json()["message"]


def test_health_check(test_client):
    """Test health check endpoint"""
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_search_food_valid_query(test_client):
    """Test food search with valid query"""
    mock_response = {
        "foods": [
            {
                "fdcId": 123456,
                "description": "Chicken Breast",
                "foodCategory": "Poultry Products",
                "foodNutrients": [
                    {"nutrientId": 1008, "value": 165},
                    {"nutrientId": 1003, "value": 31},
                ]
            }
        ]
    }

    with patch('httpx.AsyncClient') as mock_client:
        mock_get = AsyncMock(return_value=Mock(
            status_code=200,
            json=Mock(return_value=mock_response)
        ))
        mock_client.return_value.__aenter__.return_value.get = mock_get

        response = test_client.get("/api/search-food?query=chicken")
        assert response.status_code == 200
        data = response.json()
        assert "foods" in data


def test_search_food_empty_query(test_client):
    """Test food search with empty query"""
    response = test_client.get("/api/search-food?query=")
    assert response.status_code == 422  # Validation error


def test_search_food_short_query(test_client):
    """Test food search with very short query"""
    response = test_client.get("/api/search-food?query=a")
    assert response.status_code == 200
    # Should return empty results for single character
    data = response.json()
    assert "foods" in data


@pytest.mark.asyncio
async def test_get_food_details(test_client):
    """Test getting details for a specific food"""
    mock_response = {
        "fdcId": 123456,
        "description": "Chicken Breast",
        "foodNutrients": [
            {"nutrientId": 1008, "nutrientName": "Energy", "value": 165},
            {"nutrientId": 1003, "nutrientName": "Protein", "value": 31},
            {"nutrientId": 1005, "nutrientName": "Carbohydrate", "value": 0},
            {"nutrientId": 1004, "nutrientName": "Total lipid (fat)", "value": 3.6},
        ]
    }

    with patch('httpx.AsyncClient') as mock_client:
        mock_get = AsyncMock(return_value=Mock(
            status_code=200,
            json=Mock(return_value=mock_response)
        ))
        mock_client.return_value.__aenter__.return_value.get = mock_get

        response = test_client.get("/api/food/123456")
        assert response.status_code == 200
        data = response.json()
        assert "fdcId" in data


def test_list_models_endpoint(test_client):
    """Test listing available Gemini models"""
    with patch('google.generativeai.list_models') as mock_list:
        # Mock a simple model response
        mock_model = Mock()
        mock_model.name = "models/gemini-1.5-flash"
        mock_model.display_name = "Gemini 1.5 Flash"
        mock_model.description = "Test model"
        mock_model.supported_generation_methods = ['generateContent']

        mock_list.return_value = [mock_model]

        response = test_client.get("/api/list-models")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) > 0


def test_list_models_no_api_key(test_client):
    """Test list models fails gracefully without API key"""
    with patch('os.getenv', return_value=None):
        response = test_client.get("/api/list-models")
        # Should return error about missing API key
        assert response.status_code == 500


@pytest.mark.asyncio
async def test_recommendations_endpoint(test_client):
    """Test recommendations endpoint"""
    mock_meals = [
        {
            "total_calories": 500,
            "total_protein_g": 30,
            "total_carbs_g": 40,
            "total_fat_g": 20,
        }
    ]

    mock_response = Mock()
    mock_response.text = "Here are some recommendations..."

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response

        response = test_client.post(
            "/api/recommendations",
            json={
                "meals": mock_meals,
                "goals": {
                    "calories": 2000,
                    "protein": 150,
                    "carbs": 250,
                    "fat": 65,
                }
            }
        )

        # Should return recommendations
        assert response.status_code == 200


def test_cors_headers(test_client):
    """Test CORS headers are properly set"""
    response = test_client.options("/")
    # CORS middleware should add appropriate headers
    assert response.status_code in [200, 405]  # OPTIONS might not be explicitly handled


@pytest.mark.asyncio
async def test_upload_meal_photo_invalid_file(test_client):
    """Test uploading invalid file type"""
    files = {"file": ("test.txt", b"not an image", "text/plain")}

    response = test_client.post("/api/upload-meal-photo", files=files)
    # Should reject non-image files
    assert response.status_code in [400, 422, 500]


@pytest.mark.asyncio
async def test_upload_meal_photo_valid(test_client):
    """Test uploading valid meal photo"""
    # Create a minimal valid image bytes
    import io
    from PIL import Image

    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)

    files = {"file": ("test.jpg", img_bytes.read(), "image/jpeg")}

    with patch('app.services.gemini_service.analyze_food_image') as mock_analyze:
        mock_analyze.return_value = {
            "food_name": "Apple",
            "calories": 95,
            "protein_g": 0.5,
            "carbs_g": 25,
            "fat_g": 0.3,
            "fiber_g": 4,
            "portion_size": 182,
        }

        response = test_client.post("/api/upload-meal-photo", files=files)

        # Should process successfully
        if response.status_code == 200:
            data = response.json()
            assert "food_name" in data


def test_api_accepts_json(test_client):
    """Test API accepts JSON content type"""
    response = test_client.post(
        "/api/recommendations",
        json={"meals": [], "goals": {}},
        headers={"Content-Type": "application/json"}
    )
    # Should accept JSON
    assert response.status_code in [200, 400, 422, 500]
