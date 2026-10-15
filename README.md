# Curatus

Curatus is a mental wellness application with a React frontend, an Express/MySQL API, authenticated Socket.IO appointment messaging, and a Flask sentiment analysis service.

Start with [setup](docs/setup.md), then read the [architecture](docs/architecture.md) and layer references:

- [Frontend](docs/frontend.md)
- [Node backend](docs/backend.md)
- [Python backend](docs/backendpy.md)
- [Database](docs/database.md)
- [Testing and verification](docs/testing.md)
- [Implementation fixes](docs/fixes.md)
- [Operations and troubleshooting](docs/operations.md)
- [Dependency maintenance](docs/dependencies.md)

Install JavaScript dependencies with `npm ci --prefix backend` and `npm ci --prefix frontend`. Configure environments and the database as described in setup before starting services.

From the repository root:

```sh
npm test
npm run test:coverage
npm run verify
npm run verify:coverage
```

`verify` runs all three test suites and creates a frontend production build. Python tests need the lightweight dependencies in `backend-py/requirements-test.txt`; production model dependencies are separate. Set `CURATUS_TEST_PYTHON` to choose an interpreter, or the runner uses the existing `backend-py/venv` when available.

The testing reference distinguishes isolated automated tests from real database, model, provider, and browser validation.
