"""
Tests for Gemini AI service
"""
import pytest
from unittest.mock import Mock, patch
from app.services.gemini_service import analyze_food_image
import base64


@pytest.mark.asyncio
async def test_analyze_food_image_success():
    """Test successful food image analysis"""
    mock_response = Mock()
    mock_response.text = """
    {
        "foods": [{
            "name": "Grilled Chicken Breast",
            "portion": "150g",
            "calories": 248,
            "protein_g": 47,
            "carbs_g": 0,
            "fat_g": 5.4,
            "fiber_g": 0,
            "confidence": 0.9
        }],
        "total_nutrition": {
            "calories": 248,
            "protein_g": 47,
            "carbs_g": 0,
            "fat_g": 5.4,
            "fiber_g": 0
        },
        "meal_type": "lunch",
        "recommendations": "Great protein source"
    }
    """

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = b"fake_image_data"
            
            result = await analyze_food_image("fake_path.jpg")

            assert result is not None
            assert result['success'] is True
            assert 'data' in result
            assert 'foods' in result['data']


@pytest.mark.asyncio
async def test_analyze_food_image_invalid_json():
    """Test handling of invalid JSON response"""
    mock_response = Mock()
    mock_response.text = "Not a valid JSON response"

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = b"fake_image_data"

            result = await analyze_food_image("fake_path.jpg")
            # Should return error dict
            assert result is not None
            assert isinstance(result, dict)
            assert result['success'] is False


@pytest.mark.asyncio
async def test_analyze_food_image_api_error():
    """Test handling of API errors"""
    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.side_effect = Exception("API Error")
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = b"fake_image_data"

            result = await analyze_food_image("fake_path.jpg")
            # Should return error dict instead of raising
            assert result is not None
            assert result['success'] is False
            assert 'error' in result


@pytest.mark.asyncio
async def test_analyze_food_image_empty_response():
    """Test handling of empty response"""
    mock_response = Mock()
    mock_response.text = "{}"

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = b"fake_image_data"

            result = await analyze_food_image("fake_path.jpg")

            # Should return dict even if empty
            assert isinstance(result, dict)
            assert result['success'] is True


@pytest.mark.asyncio
async def test_analyze_food_image_missing_fields():
    """Test handling of response with missing fields"""
    mock_response = Mock()
    mock_response.text = """
    {
        "foods": [{"name": "Apple"}],
        "total_nutrition": {"calories": 95}
    }
    """

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = b"fake_image_data"

            result = await analyze_food_image("fake_path.jpg")

            assert result is not None
            assert result['success'] is True
            assert 'data' in result
            # Should handle missing fields gracefully


@pytest.mark.asyncio
async def test_analyze_food_image_malformed_data():
    """Test handling of malformed image data"""
    # Test with non-existent file path
    result = await analyze_food_image("non_existent_file.jpg")
    
    # Should return error dict
    assert result is not None
    assert result['success'] is False
    assert 'error' in result


def test_gemini_model_configuration():
    """Test Gemini model is configured correctly"""
    # Gemini is configured at module import time, so this test verifies
    # the service can be imported without errors
    from app.services import gemini_service
    assert gemini_service is not None


@pytest.mark.asyncio
async def test_analyze_food_image_no_api_key():
    """Test handling of missing API key"""
    with patch('os.getenv', return_value=None):
        result = await analyze_food_image("fake_path.jpg")
        
        assert result is not None
        assert result['success'] is False
        assert 'API' in result.get('error', '').upper() or 'KEY' in result.get('error', '').upper()


@pytest.mark.asyncio
async def test_analyze_food_image_with_dietary_restrictions():
    """Test analysis with dietary restrictions"""
    mock_response = Mock()
    mock_response.text = """
    {
        "foods": [{
            "name": "Tofu Stir Fry",
            "portion": "200g",
            "calories": 180,
            "protein_g": 15,
            "carbs_g": 10,
            "fat_g": 8,
            "fiber_g": 3,
            "confidence": 0.85,
            "dietary_warnings": []
        }],
        "total_nutrition": {
            "calories": 180,
            "protein_g": 15,
            "carbs_g": 10,
            "fat_g": 8,
            "fiber_g": 3
        }
    }
    """

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = b"fake_image_data"
            
            result = await analyze_food_image("fake_path.jpg", dietary_restrictions=["vegan", "gluten_free"])

            assert result is not None
            assert result['success'] is True


@pytest.mark.asyncio
async def test_analyze_food_image_markdown_response():
    """Test handling of markdown-wrapped JSON response"""
    mock_response = Mock()
    mock_response.text = """```json
    {
        "foods": [{
            "name": "Salad",
            "portion": "100g",
            "calories": 50,
            "protein_g": 2,
            "carbs_g": 8,
            "fat_g": 1,
            "fiber_g": 3
        }],
        "total_nutrition": {
            "calories": 50
        }
    }
    ```"""

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = b"fake_image_data"
            
            result = await analyze_food_image("fake_path.jpg")

            assert result is not None
            # Should parse markdown-wrapped JSON
            assert result['success'] is True
