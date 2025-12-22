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
        "food_name": "Grilled Chicken Breast",
        "portion_size": 150,
        "portion_unit": "g",
        "calories": 248,
        "protein_g": 47,
        "carbs_g": 0,
        "fat_g": 5.4,
        "fiber_g": 0
    }
    """

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response

        # Create dummy image data
        image_data = base64.b64encode(b"fake_image_data").decode()

        result = await analyze_food_image(image_data)

        assert result is not None
        assert "food_name" in result
        assert "calories" in result
        assert "protein_g" in result


@pytest.mark.asyncio
async def test_analyze_food_image_invalid_json():
    """Test handling of invalid JSON response"""
    mock_response = Mock()
    mock_response.text = "Not a valid JSON response"

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response

        image_data = base64.b64encode(b"fake_image_data").decode()

        # Should handle invalid JSON gracefully
        result = await analyze_food_image(image_data)
        # Implementation might return None or raise exception
        assert result is None or isinstance(result, dict)


@pytest.mark.asyncio
async def test_analyze_food_image_api_error():
    """Test handling of API errors"""
    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.side_effect = Exception("API Error")

        image_data = base64.b64encode(b"fake_image_data").decode()

        # Should handle API errors gracefully
        with pytest.raises(Exception):
            await analyze_food_image(image_data)


@pytest.mark.asyncio
async def test_analyze_food_image_empty_response():
    """Test handling of empty response"""
    mock_response = Mock()
    mock_response.text = "{}"

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response

        image_data = base64.b64encode(b"fake_image_data").decode()

        result = await analyze_food_image(image_data)

        # Should return dict even if empty
        assert isinstance(result, dict)


@pytest.mark.asyncio
async def test_analyze_food_image_missing_fields():
    """Test handling of response with missing fields"""
    mock_response = Mock()
    mock_response.text = """
    {
        "food_name": "Apple",
        "calories": 95
    }
    """

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response

        image_data = base64.b64encode(b"fake_image_data").decode()

        result = await analyze_food_image(image_data)

        assert result is not None
        assert "food_name" in result
        # Should handle missing fields gracefully


@pytest.mark.asyncio
async def test_analyze_food_image_malformed_data():
    """Test handling of malformed image data"""
    with patch('google.generativeai.GenerativeModel') as mock_model:
        # Test with invalid base64
        invalid_data = "not_valid_base64!!!"

        with pytest.raises(Exception):
            await analyze_food_image(invalid_data)


def test_gemini_model_configuration():
    """Test Gemini model is configured correctly"""
    with patch('google.generativeai.GenerativeModel') as mock_model:
        with patch('google.generativeai.configure') as mock_configure:
            # Trigger model initialization
            from app.services import gemini_service

            # Model should be configured with API key
            assert mock_configure.called or mock_model.called
