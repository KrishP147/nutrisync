"""
Pytest configuration and fixtures
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import os

# Set test environment variables
os.environ['GOOGLE_API_KEY'] = 'test-api-key'
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_KEY'] = 'test-supabase-key'


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app"""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    mock = Mock()
    with patch('app.main.supabase', mock):
        yield mock


@pytest.fixture
def mock_genai():
    """Mock Google Generative AI"""
    mock = Mock()
    with patch('app.main.genai', mock):
        yield mock


@pytest.fixture
def sample_food_data():
    """Sample USDA food data"""
    return {
        "fdcId": 123456,
        "description": "Chicken Breast",
        "foodNutrients": [
            {"nutrientId": 1008, "nutrientName": "Energy", "value": 165},
            {"nutrientId": 1003, "nutrientName": "Protein", "value": 31},
            {"nutrientId": 1005, "nutrientName": "Carbohydrate", "value": 0},
            {"nutrientId": 1004, "nutrientName": "Total lipid (fat)", "value": 3.6},
            {"nutrientId": 1079, "nutrientName": "Fiber", "value": 0},
        ]
    }


@pytest.fixture
def sample_meal_data():
    """Sample meal data"""
    return {
        "meal_name": "Breakfast",
        "portion_size": 100,
        "portion_unit": "g",
        "total_calories": 350,
        "total_protein_g": 12,
        "total_carbs_g": 54,
        "total_fat_g": 9,
        "total_fiber_g": 8,
        "meal_type": "breakfast",
    }
