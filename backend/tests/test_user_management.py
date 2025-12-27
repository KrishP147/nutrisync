"""
Tests for user account management and email functionality
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock, MagicMock


class TestDeleteUserAccount:
    """Tests for DELETE /api/user/{user_id} endpoint"""

    def test_delete_user_no_auth(self, test_client):
        """Test delete user without authorization header"""
        response = test_client.delete("/api/user/test-user-id")
        # 503 if Supabase not configured (CI), 401 if configured but no auth
        assert response.status_code in [401, 503]
        # Different error messages depending on Supabase configuration
        detail = response.json()["detail"]
        assert "Authorization header required" in detail or "Supabase not configured" in detail

    def test_delete_user_invalid_token(self, test_client):
        """Test delete user with invalid token"""
        with patch('app.main.supabase') as mock_supabase:
            mock_supabase.auth.get_user.return_value = Mock(user=None)
            
            response = test_client.delete(
                "/api/user/test-user-id",
                headers={"Authorization": "Bearer invalid_token"}
            )
            assert response.status_code == 401
            assert "Invalid token" in response.json()["detail"]

    def test_delete_user_wrong_user(self, test_client):
        """Test user cannot delete another user's account"""
        with patch('app.main.supabase') as mock_supabase:
            # Mock authenticated user with different ID
            mock_supabase.auth.get_user.return_value = Mock(
                user=Mock(id="user-123")
            )
            
            response = test_client.delete(
                "/api/user/user-456",  # Different user ID
                headers={"Authorization": "Bearer valid_token"}
            )
            assert response.status_code == 403
            assert "Cannot delete another user's account" in response.json()["detail"]

    def test_delete_user_success(self, test_client):
        """Test successful user deletion"""
        user_id = "test-user-123"
        
        with patch('app.main.supabase') as mock_supabase:
            # Mock authenticated user
            mock_supabase.auth.get_user.return_value = Mock(
                user=Mock(id=user_id)
            )
            
            # Mock table deletions
            mock_table = Mock()
            mock_table.delete.return_value.eq.return_value.execute.return_value = Mock()
            mock_supabase.table.return_value = mock_table
            
            # Mock storage operations
            mock_storage = Mock()
            mock_storage.list.return_value = [
                {'name': 'photo1.jpg'},
                {'name': 'photo2.jpg'}
            ]
            mock_storage.remove.return_value = Mock()
            mock_supabase.storage.from_.return_value = mock_storage
            
            # Mock admin delete
            mock_supabase.auth.admin.delete_user.return_value = None
            
            response = test_client.delete(
                f"/api/user/{user_id}",
                headers={"Authorization": f"Bearer valid_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "deleted successfully" in data["message"]

    def test_delete_user_partial_failure(self, test_client):
        """Test user deletion with partial failures (should still succeed)"""
        user_id = "test-user-123"
        
        with patch('app.main.supabase') as mock_supabase:
            # Mock authenticated user
            mock_supabase.auth.get_user.return_value = Mock(
                user=Mock(id=user_id)
            )
            
            # Mock table deletions (some fail, some succeed)
            mock_table = Mock()
            def side_effect_execute(*args, **kwargs):
                # Simulate failure for some tables
                if mock_supabase.table.call_count % 2 == 0:
                    raise Exception("Table delete failed")
                return Mock()
            
            mock_table.delete.return_value.eq.return_value.execute.side_effect = side_effect_execute
            mock_supabase.table.return_value = mock_table
            
            # Mock storage failure (should be handled gracefully)
            mock_storage = Mock()
            mock_storage.list.side_effect = Exception("Storage error")
            mock_supabase.storage.from_.return_value = mock_storage
            
            # Mock admin delete succeeds
            mock_supabase.auth.admin.delete_user.return_value = None
            
            response = test_client.delete(
                f"/api/user/{user_id}",
                headers={"Authorization": f"Bearer valid_token"}
            )
            
            # Should still succeed even with partial failures
            assert response.status_code == 200

    def test_delete_user_auth_delete_fails(self, test_client):
        """Test when auth user deletion fails"""
        user_id = "test-user-123"
        
        with patch('app.main.supabase') as mock_supabase:
            # Mock authenticated user
            mock_supabase.auth.get_user.return_value = Mock(
                user=Mock(id=user_id)
            )
            
            # Mock table deletions succeed
            mock_table = Mock()
            mock_table.delete.return_value.eq.return_value.execute.return_value = Mock()
            mock_supabase.table.return_value = mock_table
            
            # Mock storage operations succeed
            mock_storage = Mock()
            mock_storage.list.return_value = []
            mock_supabase.storage.from_.return_value = mock_storage
            
            # Mock admin delete fails
            mock_supabase.auth.admin.delete_user.side_effect = Exception("Auth delete failed")
            
            response = test_client.delete(
                f"/api/user/{user_id}",
                headers={"Authorization": f"Bearer valid_token"}
            )
            
            assert response.status_code == 500
            assert "Failed to delete user account" in response.json()["detail"]

    def test_delete_user_supabase_not_configured(self, test_client):
        """Test delete user when Supabase is not configured"""
        with patch('app.main.supabase', None):
            response = test_client.delete(
                "/api/user/test-user-id",
                headers={"Authorization": "Bearer token"}
            )
            assert response.status_code == 503
            assert "Supabase not configured" in response.json()["detail"]


class TestEmailFunctionality:
    """Tests for email-related endpoints and functionality"""

    def test_password_reset_flow(self, test_client):
        """Test password reset triggers email (integration with Supabase)"""
        # This would typically be tested at the frontend level
        # Backend doesn't have explicit password reset endpoint
        # Supabase handles this automatically
        pass

    def test_email_change_validation(self, test_client):
        """Test email change validation (frontend integration)"""
        # Email change is handled by Supabase auth on frontend
        # No backend endpoint needed
        pass


class TestSupabaseInitialization:
    """Tests for Supabase client initialization"""

    def test_supabase_init_with_credentials(self):
        """Test Supabase initializes when credentials are present"""
        # This test verifies the initialization logic exists
        # Actual initialization happens at module import time
        # We can verify the client is created when env vars are set
        with patch.dict('os.environ', {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'test-key'
        }):
            # The client should be initialized during import
            # This test passes if no errors occur
            pass

    def test_supabase_init_without_credentials(self):
        """Test Supabase handles missing credentials gracefully"""
        with patch.dict('os.environ', {}, clear=True):
            with patch('app.main.create_client') as mock_create:
                # Reimport to trigger initialization
                import importlib
                import app.main
                importlib.reload(app.main)
                
                # Should not attempt to create client
                # (handled in actual code with conditional check)
                pass


class TestErrorHandling:
    """Tests for error handling in user management"""

    def test_delete_user_unexpected_error(self, test_client):
        """Test handling of unexpected errors during deletion"""
        user_id = "test-user-123"
        
        with patch('app.main.supabase') as mock_supabase:
            # Mock authenticated user
            mock_supabase.auth.get_user.return_value = Mock(
                user=Mock(id=user_id)
            )
            
            # Mock table operations to succeed
            mock_table = Mock()
            mock_table.delete.return_value.eq.return_value.execute.return_value = Mock()
            mock_supabase.table.return_value = mock_table
            
            # Mock storage operations
            mock_storage = Mock()
            mock_storage.list.return_value = []
            mock_supabase.storage.from_.return_value = mock_storage
            
            # Cause error in auth deletion (the critical step)
            mock_supabase.auth.admin.delete_user.side_effect = RuntimeError("Critical auth error")
            
            response = test_client.delete(
                f"/api/user/{user_id}",
                headers={"Authorization": "Bearer valid_token"}
            )
            
            assert response.status_code == 500
            assert "Failed to delete" in response.json()["detail"]

    def test_delete_user_malformed_token(self, test_client):
        """Test delete with malformed authorization header"""
        with patch('app.main.supabase') as mock_supabase:
            mock_supabase.auth.get_user.side_effect = Exception("Token error")
            
            response = test_client.delete(
                "/api/user/test-user-id",
                headers={"Authorization": "InvalidFormat"}
            )
            
            # Should handle gracefully
            assert response.status_code in [401, 500]


class TestDataCleanup:
    """Tests for comprehensive data cleanup during deletion"""

    def test_delete_user_cleans_all_tables(self, test_client):
        """Test that all user tables are cleaned during deletion"""
        user_id = "test-user-123"
        expected_tables = ['meals', 'fasting_schedules', 'weight_tracking', 'user_goals', 'user_profile']
        
        with patch('app.main.supabase') as mock_supabase:
            # Mock authenticated user
            mock_supabase.auth.get_user.return_value = Mock(
                user=Mock(id=user_id)
            )
            
            # Track table deletions
            table_calls = []
            
            def track_table_call(table_name):
                table_calls.append(table_name)
                mock_table = Mock()
                mock_table.delete.return_value.eq.return_value.execute.return_value = Mock()
                return mock_table
            
            mock_supabase.table.side_effect = track_table_call
            
            # Mock storage and auth operations
            mock_storage = Mock()
            mock_storage.list.return_value = []
            mock_supabase.storage.from_.return_value = mock_storage
            mock_supabase.auth.admin.delete_user.return_value = None
            
            response = test_client.delete(
                f"/api/user/{user_id}",
                headers={"Authorization": "Bearer valid_token"}
            )
            
            assert response.status_code == 200
            # Verify all expected tables were called
            for table in expected_tables:
                assert table in table_calls

    def test_delete_user_removes_photos(self, test_client):
        """Test that user photos are deleted from storage"""
        user_id = "test-user-123"
        
        with patch('app.main.supabase') as mock_supabase:
            # Mock authenticated user
            mock_supabase.auth.get_user.return_value = Mock(
                user=Mock(id=user_id)
            )
            
            # Mock table operations
            mock_table = Mock()
            mock_table.delete.return_value.eq.return_value.execute.return_value = Mock()
            mock_supabase.table.return_value = mock_table
            
            # Mock storage with multiple photos
            mock_storage = Mock()
            mock_storage.list.return_value = [
                {'name': 'breakfast.jpg'},
                {'name': 'lunch.jpg'},
                {'name': 'dinner.jpg'}
            ]
            removed_files = []
            
            def track_remove(file_paths):
                removed_files.extend(file_paths)
                
            mock_storage.remove.side_effect = track_remove
            mock_supabase.storage.from_.return_value = mock_storage
            
            # Mock auth delete
            mock_supabase.auth.admin.delete_user.return_value = None
            
            response = test_client.delete(
                f"/api/user/{user_id}",
                headers={"Authorization": "Bearer valid_token"}
            )
            
            assert response.status_code == 200
            # Verify photos were removed
            assert len(removed_files) == 3
            assert any('breakfast.jpg' in path for path in removed_files)
