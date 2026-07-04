from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.routers import auth, donor, admin, facility, blood_lab, hospital, donation_staff, lab_staff, staff, camps

app = FastAPI(
    title="Blood Bank Backup Backend - FastAPI",
    version="1.0.0",
    description="Backend phụ Python/FastAPI tương thích gần nhất với backend Node.js/Express gốc.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "*"],
)


@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()


@app.get("/")
async def root():
    return {"success": True, "message": "Python backup backend is running"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "python-backup-backend"}


# Include routers with the same prefixes as Express server.js
app.include_router(auth.router)
app.include_router(donor.router)
app.include_router(facility.router)
app.include_router(admin.router)
app.include_router(blood_lab.router)
app.include_router(lab_staff.router)
app.include_router(hospital.router)
app.include_router(donation_staff.router)
app.include_router(staff.router)
app.include_router(camps.router)


@app.websocket("/ws/chat")
async def websocket_chat(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            message = await ws.receive_text()
            await ws.send_json({"success": True, "reply": f"Backup chatbot received: {message}"})
    except WebSocketDisconnect:
        return
