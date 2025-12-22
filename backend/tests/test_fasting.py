import pytest
from unittest.mock import Mock, patch
import json
from datetime import datetime

def test_recommend_fasting_duration_valid(test_client):
    """Test fasting recommendation with valid goals"""
    mock_goals = {
        "calories": 2200,
        "protein": 160,
        "fasting_schedule_type": "18:6",
        "fasting_start_time": "19:00"
    }
    
    # Mock Gemini response
    mock_response = Mock()
    mock_response.text = '{"recommended_duration": 18, "reasoning": "Based on your preference for an 18:6 schedule, starting at 7 PM is ideal."}'
    
    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        
        response = test_client.post(
            "/api/fasting/recommend",
            json={
                "goals": mock_goals,
                "current_time": "2023-10-27T18:00:00"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["recommended_duration"] == 18
        assert "18:6 schedule" in data["reasoning"]

def test_recommend_fasting_duration_no_api_key(test_client):
    """Test fallback when GOOGLE_API_KEY is not set"""
    mock_goals = {
        "fasting_duration_hours": 16,
        "fasting_schedule_type": "16:8"
    }
    
    with patch('os.getenv', side_effect=lambda k, d=None: None if k == 'GOOGLE_API_KEY' else d):
        response = test_client.post(
            "/api/fasting/recommend",
            json={"goals": mock_goals}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["recommended_duration"] == 16
        assert "schedule setting" in data["reasoning"]

def test_recommend_fasting_duration_gemini_error(test_client):
    """Test fallback when Gemini AI fails"""
    mock_goals = {
        "fasting_duration_hours": 20,
        "fasting_schedule_type": "20:4"
    }
    
    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.side_effect = Exception("API Error")
        
        response = test_client.post(
            "/api/fasting/recommend",
            json={"goals": mock_goals}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Fallback to 16 if everything fails (as per main.py implementation)
        assert data["recommended_duration"] == 16
        assert "Standard 16-hour fast" in data["reasoning"]

def test_recommend_fasting_duration_parse_error(test_client):
    """Test fallback when Gemini returns invalid JSON"""
    mock_goals = {
        "fasting_duration_hours": 18,
        "fasting_schedule_type": "18:6"
    }
    
    mock_response = Mock()
    mock_response.text = "NOT JSON"
    
    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        
        response = test_client.post(
            "/api/fasting/recommend",
            json={"goals": mock_goals}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should fallback to goals preference on parse error
        assert data["recommended_duration"] == 18
        assert "18:6 schedule" in data["reasoning"]
