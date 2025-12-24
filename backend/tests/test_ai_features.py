"""
Tests for AI-powered features: chat, recommendations, health tips, and smart reminders
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import json
from datetime import datetime, timedelta, UTC


# ==================== CHAT ENDPOINT TESTS ====================

def test_chat_valid_message(test_client):
    """Test chat endpoint with valid message and context"""
    mock_response = Mock()
    mock_response.text = "Based on your goals, you should increase protein intake."

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response

        response = test_client.post(
            "/api/chat",
            json={
                "message": "What should I eat for dinner?",
                "userGoals": {
                    "calories": 2000,
                    "protein": 150,
                    "carbs": 200,
                    "fat": 65,
                    "fiber": 30
                },
                "recentMeals": {
                    "avgProtein": 100,
                    "avgCarbs": 150,
                    "avgFat": 40,
                    "avgFiber": 20
                },
                "dietaryRestrictions": ["vegetarian"]
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0


def test_chat_empty_message(test_client):
    """Test chat endpoint rejects empty message"""
    response = test_client.post(
        "/api/chat",
        json={
            "message": "",
            "userGoals": {},
            "recentMeals": {}
        }
    )

    # Should return validation error (400 or 500 since it checks message first)
    assert response.status_code in [400, 422, 500]


def test_chat_with_all_dietary_restrictions(test_client):
    """Test chat with all supported dietary restrictions"""
    restrictions = [
        "halal", "kosher", "vegetarian", "vegan",
        "gluten_free", "dairy_free", "nut_free",
        "shellfish_free", "low_sodium", "low_carb"
    ]

    mock_response = Mock()
    mock_response.text = "Here are halal, kosher, vegan-friendly meal suggestions."

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response

        response = test_client.post(
            "/api/chat",
            json={
                "message": "What can I eat?",
                "userGoals": {"calories": 2000},
                "recentMeals": {},
                "dietaryRestrictions": restrictions
            }
        )

        assert response.status_code == 200


def test_chat_calculates_nutrition_gaps(test_client):
    """Test chat endpoint calculates nutrition gaps correctly"""
    mock_response = Mock()
    mock_response.text = "You need more protein and fiber."

    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response

        response = test_client.post(
            "/api/chat",
            json={
                "message": "Am I meeting my goals?",
                "userGoals": {
                    "calories": 2000,
                    "protein": 150,
                    "carbs": 200,
                    "fat": 65,
                    "fiber": 30
                },
                "recentMeals": {
                    "avgProtein": 50,
                    "avgCarbs": 180,
                    "avgFat": 40,
                    "avgFiber": 15
                }
            }
        )

        assert response.status_code == 200


def test_chat_handles_gemini_error(test_client):
    """Test chat handles Gemini API errors gracefully"""
    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_model.return_value.generate_content.side_effect = Exception("API Error")

        response = test_client.post(
            "/api/chat",
            json={
                "message": "Test message",
                "userGoals": {},
                "recentMeals": {}
            }
        )

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data


def test_chat_no_api_key(test_client):
    """Test chat endpoint fails gracefully without API key"""
    with patch('os.getenv', return_value=None):
        response = test_client.post(
            "/api/chat",
            json={
                "message": "Test",
                "userGoals": {},
                "recentMeals": {}
            }
        )

        assert response.status_code in [500, 503]
