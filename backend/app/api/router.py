from fastapi import APIRouter

from app.api.routes import auth, chat, doctor, hello, tests

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(hello.router)
api_router.include_router(tests.router)
api_router.include_router(doctor.router)
api_router.include_router(chat.router)
