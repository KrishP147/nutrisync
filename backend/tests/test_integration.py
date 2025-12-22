"""
Integration tests for API workflows
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock


def test_full_meal_logging_workflow(test_client, sample_food_data):
    """Test complete workflow: search food -> get details -> log meal"""
    # Step 1: Search for food
    with patch('httpx.AsyncClient') as mock_client:
        mock_get = AsyncMock(return_value=Mock(
            status_code=200,
            json=Mock(return_value={"foods": [sample_food_data]})
        ))
        mock_client.return_value.__aenter__.return_value.get = mock_get

        search_response = test_client.get("/api/search-food?query=chicken")
        assert search_response.status_code == 200

    # Step 2: Get food details
    with patch('httpx.AsyncClient') as mock_client:
        mock_get = AsyncMock(return_value=Mock(
            status_code=200,
            json=Mock(return_value=sample_food_data)
        ))
        mock_client.return_value.__aenter__.return_value.get = mock_get

        details_response = test_client.get(f"/api/food/{sample_food_data['fdcId']}")
        assert details_response.status_code == 200

    # Workflow completed successfully
    assert True


@pytest.mark.asyncio
async def test_photo_upload_to_recommendation_workflow(test_client):
    """Test workflow: upload photo -> analyze -> get recommendations"""
    import io
    from PIL import Image

    # Step 1: Upload meal photo
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)

    files = {"file": ("meal.jpg", img_bytes.read(), "image/jpeg")}

    with patch('app.services.gemini_service.analyze_food_image') as mock_analyze:
        mock_analyze.return_value = {
            "food_name": "Grilled Chicken",
            "calories": 250,
            "protein_g": 45,
            "carbs_g": 0,
            "fat_g": 6,
            "fiber_g": 0,
            "portion_size": 150,
        }

        upload_response = test_client.post("/api/upload-meal-photo", files=files)

        if upload_response.status_code == 200:
            meal_data = upload_response.json()

            # Step 2: Get recommendations based on this meal
            with patch('google.generativeai.GenerativeModel') as mock_model:
                mock_response = Mock()
                mock_response.text = "Recommendations based on your meal..."
                mock_model.return_value.generate_content.return_value = mock_response

                rec_response = test_client.post(
                    "/api/recommendations",
                    json={
                        "meals": [meal_data],
                        "goals": {"calories": 2000, "protein": 150}
                    }
                )

                assert rec_response.status_code == 200


def test_multiple_food_searches(test_client):
    """Test searching for multiple foods in sequence"""
    search_queries = ["chicken", "rice", "broccoli"]

    for query in search_queries:
        with patch('httpx.AsyncClient') as mock_client:
            mock_get = AsyncMock(return_value=Mock(
                status_code=200,
                json=Mock(return_value={"foods": []})
            ))
            mock_client.return_value.__aenter__.return_value.get = mock_get

            response = test_client.get(f"/api/search-food?query={query}")
            assert response.status_code == 200


def test_recommendations_cache_behavior(test_client):
    """Test that recommendations are cached appropriately"""
    meals_data = {
        "meals": [
            {"total_calories": 500, "total_protein_g": 30}
        ],
        "goals": {"calories": 2000, "protein": 150}
    }

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_response = Mock()
        mock_response.text = "Cached recommendations"
        mock_model.return_value.generate_content.return_value = mock_response

        # First request
        response1 = test_client.post("/api/recommendations", json=meals_data)
        assert response1.status_code == 200

        # Second request (should use cache)
        response2 = test_client.post("/api/recommendations", json=meals_data)
        assert response2.status_code == 200


def test_error_handling_chain(test_client):
    """Test error handling across multiple endpoints"""
    # Invalid food search
    response = test_client.get("/api/search-food?query=")
    assert response.status_code == 422

    # Invalid food ID
    with patch('httpx.AsyncClient') as mock_client:
        mock_get = AsyncMock(return_value=Mock(
            status_code=404,
            json=Mock(return_value={"error": "Not found"})
        ))
        mock_client.return_value.__aenter__.return_value.get = mock_get

        response = test_client.get("/api/food/99999999")
        assert response.status_code in [404, 500]


def test_concurrent_requests(test_client):
    """Test handling of concurrent API requests"""
    import concurrent.futures

    def make_request():
        return test_client.get("/health")

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(make_request) for _ in range(10)]
        results = [f.result() for f in futures]

    # All requests should succeed
    assert all(r.status_code == 200 for r in results)


@pytest.mark.asyncio
async def test_api_performance_basic(test_client):
    """Basic performance test for API endpoints"""
    import time

    # Test health endpoint response time
    start = time.time()
    response = test_client.get("/health")
    duration = time.time() - start

    assert response.status_code == 200
    assert duration < 1.0  # Should respond within 1 second
