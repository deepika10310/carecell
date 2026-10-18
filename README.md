# Carecell

Carecell includes a Next.js App Router frontend, a FastAPI API, and a MySQL-backed account sign-in flow, running together in Docker Compose.

## Project structure

```text
frontend/
	app/                      # Routes, root layout, global styles
	modules/landing/          # Landing page feature
	modules/auth/             # Login/register screens and API client
backend/
	app/
		api/routes/             # HTTP route handlers
		api/router.py           # API route registration
		main.py                 # FastAPI application and middleware
		models/                 # SQLAlchemy models
		services/               # Authentication and database services
	main.py                   # Uvicorn entry point used by Compose
docker-compose.yml          # Local development services
```

The frontend keeps route entries in `app/` and feature code in `modules/`. The backend uses SQLAlchemy with MySQL, Argon2 password hashes, and short-lived signed sessions stored in HttpOnly cookies. Each user has a `Patient`, `Doctor`, or `Admin` role. Public registration always creates a `Patient`; only an administrator can change roles through `PATCH /api/auth/users/{user_id}/role`. Startup creates the users table and adds the role column to an existing local database; use versioned migrations before production deployment.

## Run with Docker

From the project root:

```sh
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend greeting: http://localhost:8000/api/hello
- Backend API docs: http://localhost:8000/docs
- Sign in: http://localhost:3000/login
- Create account: http://localhost:3000/register
- Patient workspace: http://localhost:3000/patient
- Doctor workspace: http://localhost:3000/doctor
- Admin workspace: http://localhost:3000/admin

The frontend requests `/api/hello` from the browser and displays the greeting, loading state, or a retryable error state. Login and registration send credentials to the FastAPI API; passwords are Argon2-hashed and sessions use HttpOnly cookies.

The root `.env` is ignored by Git. It configures the local MySQL root password, the least-privilege `carecell_app` database account, and the session signing secret. The supplied `root/mysql` credentials are intended for local development only; change them and `JWT_SECRET_KEY` before any shared or production deployment. Never use the MySQL root account from the application.

New accounts can be created from `/register`. After login or registration, Carecell redirects to the dashboard for the user's assigned role. Dashboard routes verify the session with `GET /api/auth/me` and send unauthenticated users to `/login`. The login API is `POST /api/auth/login`; related endpoints are `POST /api/auth/register`, `GET /api/auth/me`, and `POST /api/auth/logout`.

For local development, promote a trusted account to the first administrator using a controlled MySQL session after registering it: `UPDATE users SET role = 'Admin' WHERE email = 'trusted-admin@example.com';`. Afterward, sign in as that administrator to assign `Doctor`, `Patient`, or `Admin` roles through the protected role-management endpoint. Do not expose a role selector on public registration.

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

When running the backend without Compose, set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `JWT_SECRET_KEY` in the backend process environment. The root `.env` is automatically loaded by Docker Compose, not by a bare Uvicorn process.
