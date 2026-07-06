from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongodb import close_mongo_connection, connect_to_mongo, get_database
from app.routers.auth import router as auth_router
from app.routers.blood_lab import router as blood_lab_router
from app.routers.hospital import router as hospital_router
from app.routers.facility import router as facility_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="Blood Bank Python Blood Lab Backend",
    description="Python backend focused on Blood Lab functions, compatible with Node.js BBMS endpoints.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Blood Lab Python backend is running",
        "docs": "/docs",
        "health": "/health",
        "bloodLab": "/api/blood-lab/dashboard",
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "python-bloodlab-backend"}


@app.get("/health/db")
async def database_health():
    db = get_database()
    await db.command("ping")
    return {"status": "ok", "database": db.name}


app.include_router(auth_router)
app.include_router(blood_lab_router)
app.include_router(hospital_router)
app.include_router(facility_router)
