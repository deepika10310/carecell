# Hello Stack

A minimal full-stack starter with a Next.js App Router frontend and a FastAPI backend, both running in Docker Compose.

## Project structure

```text
frontend/
	app/                      # Routes, root layout, global styles
	components/landing/       # Landing page sections and interactive preview
	lib/api/                  # Typed API client functions
	types/                    # Shared frontend data types
backend/
	app/
		api/routes/             # HTTP route handlers
		api/router.py           # API route registration
		main.py                 # FastAPI application and middleware
	main.py                   # Uvicorn entry point used by Compose
docker-compose.yml          # Local development services
```

The frontend keeps route composition separate from the interactive API preview and API transport code. The backend groups endpoints under `app/api/routes` and registers them through one API router.

## Run with Docker

From the project root:

```sh
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend greeting: http://localhost:8000/api/hello
- Backend API docs: http://localhost:8000/docs

The frontend requests `/api/hello` from the browser and displays the greeting, loading state, or a retryable error state. Compose configures the browser-facing API URL and FastAPI allows the local frontend origin.

## Run services without Docker

### Backend

```sh
cd backend
poetry install
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```sh
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` if the backend is hosted somewhere other than `http://localhost:8000`.
