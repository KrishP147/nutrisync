import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';

// Mock Supabase
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn()
    }
  }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders login form', () => {
    renderLogin();

    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('displays login button', () => {
    renderLogin();

    const loginButton = screen.getByRole('button', { name: /login/i });
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toHaveClass('btn-primary');
  });

  it('accepts email and password input', async () => {
    renderLogin();

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
    expect(passwordInput.type).toBe('password');
  });

  it('calls supabase signIn on form submission', async () => {
    const { supabase } = await import('../../supabaseClient');
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: '123' }, session: {} },
      error: null
    });

    renderLogin();

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123!',
        options: {
          data: {
            remember: false
          }
        }
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message on failed login', async () => {
    const { supabase } = await import('../../supabaseClient');
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' }
    });

    renderLogin();

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid login credentials/i)).toBeInTheDocument();
    });
  });

  it('includes link to registration page', () => {
    renderLogin();

    const signupLink = screen.getByText(/signup/i);
    expect(signupLink).toBeInTheDocument();
    expect(signupLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('includes forgot password link', () => {
    renderLogin();

    const forgotLink = screen.getByText(/forgot password/i);
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('validates email format', async () => {
    renderLogin();

    // The email input has type="email" which provides browser-level validation
    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeInTheDocument();
  });

  it('handles Google OAuth login', async () => {
    const { supabase } = await import('../../supabaseClient');
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://google.com/oauth' },
      error: null
    });

    renderLogin();

    const googleButton = screen.getByText(/continue with google/i);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/dashboard')
        }
      });
      expect(localStorage.getItem('oauth_flow_origin')).toBe('login');
      expect(localStorage.getItem('oauth_account_check')).toBe('login_attempt');
    });
  });

  it('displays OAuth error from localStorage on mount', () => {
    localStorage.setItem('oauth_login_error', 'OAuth authentication failed');

    renderLogin();

    expect(screen.getByText(/OAuth authentication failed/i)).toBeInTheDocument();
    expect(localStorage.getItem('oauth_login_error')).toBeNull();
  });

  it('toggles password visibility', async () => {
    renderLogin();

    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const toggleButton = screen.getByRole('button', { name: '' });

    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('handles remember me checkbox', async () => {
    const { supabase } = await import('../../supabaseClient');
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: '123' }, session: {} },
      error: null
    });

    renderLogin();

    const rememberCheckbox = screen.getByLabelText(/remember me/i);
    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.click(rememberCheckbox);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123!',
        options: {
          data: {
            remember: true
          }
        }
      });
    });
  });

  it('shows loading state during login', async () => {
    const { supabase } = await import('../../supabaseClient');
    let resolveLogin;
    supabase.auth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => { resolveLogin = resolve; })
    );

    renderLogin();

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/logging in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    resolveLogin({ data: { user: { id: '123' }, session: {} }, error: null });
  });

  it('handles Google OAuth error', async () => {
    const { supabase } = await import('../../supabaseClient');
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'Google OAuth failed' }
    });

    renderLogin();

    const googleButton = screen.getByText(/continue with google/i);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/Google OAuth failed/i)).toBeInTheDocument();
      expect(localStorage.getItem('oauth_flow_origin')).toBeNull();
      expect(localStorage.getItem('oauth_account_check')).toBeNull();
    });
  });

  it('shows link to signup page when no account found', async () => {
    const { supabase } = await import('../../supabaseClient');
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'No account found with this email' }
    });

    renderLogin();

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/go to signup/i)).toBeInTheDocument();
    });
  });
});
