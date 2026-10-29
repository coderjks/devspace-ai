from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    activity,
    agents,
    auth,
    diagnostics,
    enrollments,
    evaluations,
    github,
    health,
    progress,
    progression,
    projects,
    roadmap,
    standups,
    tasks,
    team,
    users,
    voice,
)

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(enrollments.router)
app.include_router(diagnostics.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(progress.router)
app.include_router(roadmap.router)
app.include_router(team.router)
app.include_router(agents.router)
app.include_router(standups.router)
app.include_router(activity.router)
app.include_router(github.router)
app.include_router(evaluations.router)
app.include_router(progression.router)
app.include_router(voice.router)


@app.get("/")
def root() -> dict:
    return {"service": settings.app_name, "docs": "/docs", "health": "/health"}
