# Tests

This directory contains unit and integration tests for the Claude Conversation Exporter.

## Test Structure

- **`utils.test.ts`** - Unit tests for utility functions (model inference, conversion, filename generation, etc.)
- **`types.test.ts`** - Type definition validation tests
- **`integration.test.ts`** - Integration tests for complete workflows
- **`mockData.ts`** - Shared mock data and fixtures for tests
- **`setup.ts`** - Vitest setup and browser API mocks

## Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Coverage

Test coverage reports are generated in the `coverage/` directory when running `pnpm test:coverage`.

## Writing Tests

When adding new features:

1. Add mock data to `mockData.ts` if needed
2. Create unit tests for individual functions
3. Add integration tests for complete workflows
4. Ensure tests cover edge cases and error scenarios
5. Run `pnpm test:coverage` to check coverage

## Test Environment

Tests run using:
- **Vitest** as the test runner
- **happy-dom** for DOM simulation
- **Browser API mocks** for extension APIs (defined in `setup.ts`)
