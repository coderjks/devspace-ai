from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import User
from app.schemas import TeamMemberOut, TeamOut

router = APIRouter(tags=["team"])

# Phase 02 serves a static directory (no chat, no AI). Conversational
# teammates arrive in Phase 03 with versioned role configs and an orchestrator.
MEMBERS: list[dict] = [
    {
        "id": "engineering-manager",
        "name": "A. Rao",
        "role": "Engineering Manager",
        "responsibilities": "Onboarding, goal setting, progress check-ins, retrospective feedback.",
        "kind": "teammate",
    },
    {
        "id": "tech-lead",
        "name": "S. Iyer",
        "role": "Tech Lead",
        "responsibilities": "Architecture discussion, task clarification, dependencies, planning.",
        "kind": "teammate",
    },
    {
        "id": "senior-engineer",
        "name": "R. Nair",
        "role": "Senior Software Engineer",
        "responsibilities": "Debugging guidance, code-quality feedback, progressive technical hints.",
        "kind": "teammate",
    },
    {
        "id": "qa-engineer",
        "name": "P. Das",
        "role": "QA Engineer",
        "responsibilities": "Edge-case questions, acceptance-criteria coverage, test gap feedback.",
        "kind": "teammate",
    },
    {
        "id": "scrum-master",
        "name": "K. Menon",
        "role": "Scrum Master",
        "responsibilities": "Async standups, blocker tracking, sprint retrospectives.",
        "kind": "teammate",
    },
    {
        "id": "learning-assistant",
        "name": "DevGuide",
        "role": "AI Learning Assistant",
        "responsibilities": "Concept explanations, Socratic questioning, progressive hints. Not a coworker; never supplies full solutions.",
        "kind": "assistant",
    },
]


@router.get("/api/team", response_model=TeamOut)
def get_team(current_user: User = Depends(get_current_user)) -> TeamOut:
    return TeamOut(members=[TeamMemberOut.model_validate(m) for m in MEMBERS])
