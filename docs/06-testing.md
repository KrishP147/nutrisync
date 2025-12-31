# Testing

## Backend Tests

### Run All Tests

```bash
cd backend
pytest tests/ -v
```

### Run with Coverage

```bash
pytest tests/ --cov=app --cov-report=html
```

Coverage report generated in `htmlcov/index.html`

### Test Structure

```
backend/tests/
├── conftest.py           # Test fixtures and configuration
├── test_main.py          # API endpoint tests
├── test_gemini_service.py # AI service tests
├── test_integration.py   # Integration tests
└── test_fasting.py       # Fasting feature tests
```

### Current Status

- Total tests: 85
- Coverage: 74.5%
- All critical paths tested

## Frontend Tests

### Run All Tests

```bash
cd frontend
npm test
```

### Run in Watch Mode

```bash
npm run test:watch
```

### Run with UI

```bash
npm run test:ui
```

### Generate Coverage Report

```bash
npm run test:coverage
```

### Test Structure

```
frontend/src/
├── components/
│   └── __tests__/       # Component tests
├── services/
│   └── __tests__/       # Service tests
└── pages/
    └── __tests__/       # Page tests
```

### Current Status

- Total tests: 137
- Passing: 137
- Coverage: 60.4%
- Framework: Vitest + React Testing Library

## Continuous Integration

Tests run automatically via GitHub Actions on:
- Pull requests
- Pushes to main branch

See `.github/workflows/ci.yml` for CI configuration.

## Writing Tests

### Backend Test Example

```python
def test_search_food(client):
    response = client.get("/api/search-food?query=apple")
    assert response.status_code == 200
    assert "foods" in response.json()
```

### Frontend Test Example

```javascript
import { render, screen } from '@testing-library/react'
import { Login } from './Login'

test('renders login form', () => {
  render(<Login />)
  expect(screen.getByText('Sign In')).toBeInTheDocument()
})
```

## Troubleshooting

### Backend tests fail with import errors

Ensure virtual environment is activated:
```bash
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows
```

### Frontend tests fail with module errors

Clear cache and reinstall:
```bash
rm -rf node_modules
npm install
```

### Tests pass locally but fail in CI

Check:
- Environment variables are set in GitHub Secrets
- Dependencies are correctly specified in `requirements.txt` and `package.json`
- No system-specific paths in tests

Next: [Deployment](07-deployment.md)
