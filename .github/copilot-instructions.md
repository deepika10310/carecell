# Workspace instructions

- This repository contains a Next.js App Router frontend in `frontend/` and a FastAPI backend in `backend/`.
- Keep Docker Compose as the primary local development workflow; services are exposed on ports 3000 and 8000.
- The frontend browser calls `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`); keep backend CORS origins aligned with local frontend URLs.
- Use TypeScript for frontend code and Poetry-managed dependencies for the backend.
- See `README.md` for startup instructions.
