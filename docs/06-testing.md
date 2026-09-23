# Testing

## Backend Tests

The backend is now Supabase Edge Functions (`supabase/functions/`). The old
FastAPI pytest suite (85 tests) was retired along with the FastAPI app - it
tested code that no longer exists. There is no automated backend test suite
yet; adding one would mean `deno test` specs per function (not set up here).

Manually verify a function locally with:
```bash
supabase functions serve --env-file supabase/.env
curl "http://localhost:54321/functions/v1/search-food?query=apple"
```

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

### Frontend tests fail with module errors

Clear cache and reinstall:
```bash
rm -rf node_modules
npm install
```

### Tests pass locally but fail in CI

Check:
- Environment variables are set in GitHub Secrets
- Dependencies are correctly specified in `package.json`
- No system-specific paths in tests

Next: [Deployment](07-deployment.md)
