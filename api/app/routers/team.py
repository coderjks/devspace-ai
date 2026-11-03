from fastapi import APIRouter, Depends

from app.agents.roles import PERSONA_IDS, get_role
from app.dependencies import get_current_user
from app.models import User
from app.schemas import TeamMemberOut, TeamOut

router = APIRouter(tags=["team"])

# Display-only blurbs per persona. Names come from the versioned role configs
# (single source of truth shared with the chat orchestrator).
RESPONSIBILITIES: dict[str, str] = {
    "engineering-manager": "Onboarding, goal setting, progress check-ins, retrospective feedback.",
    "tech-lead": "Architecture discussion, task clarification, dependencies, planning.",
    "senior-engineer": "Debugging guidance, code-quality feedback, progressive technical hints.",
    "qa-engineer": "Edge-case questions, acceptance-criteria coverage, test gap feedback.",
    "scrum-master": "Async standups, blocker tracking, sprint retrospectives.",
    "learning-assistant": "Concept explanations, Socratic questioning, progressive hints. Not a coworker; never supplies full solutions.",
}


@router.get("/api/team", response_model=TeamOut)
def get_team(current_user: User = Depends(get_current_user)) -> TeamOut:
    members = []
    for pid in PERSONA_IDS:
        role = get_role(pid)
        members.append(
            TeamMemberOut.model_validate(
                {
                    "id": pid,
                    "name": role["name"],
                    "role": role["title"],
                    "responsibilities": RESPONSIBILITIES[pid],
                    "kind": role["kind"],
                }
            )
        )
    return TeamOut(members=members)
