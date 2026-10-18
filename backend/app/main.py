from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import JWT_SECRET_KEY
from app.services.database import initialize_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    if len(JWT_SECRET_KEY) < 32:
        raise RuntimeError("Set JWT_SECRET_KEY to a random value of at least 32 characters.")
    initialize_database()
    yield


app = FastAPI(title="Carecell API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
