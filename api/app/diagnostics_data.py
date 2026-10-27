"""Optional onboarding diagnostic: short Python/Git check.

Questions are public; correct answers stay server-side and are never
serialized to clients. Keep the set small and stable for the hackathon.
"""

QUESTIONS: list[dict] = [
    {
        "id": "py-list",
        "prompt": "What does `[x * 2 for x in [1, 2, 3]]` evaluate to in Python?",
        "choices": ["[1, 2, 3, 1, 2, 3]", "[2, 4, 6]", "[1, 4, 9]", "An error"],
        "answer": 1,
        "topic": "python",
    },
    {
        "id": "py-dict",
        "prompt": "After `d = {'a': 1}` runs, what does `d.get('b', 0)` return?",
        "choices": ["None", "0", "KeyError is raised", "'b'"],
        "answer": 1,
        "topic": "python",
    },
    {
        "id": "git-status",
        "prompt": "Which command shows staged and unstaged changes in your working tree?",
        "choices": ["git log --oneline", "git status", "git stash list", "git remote -v"],
        "answer": 1,
        "topic": "git",
    },
    {
        "id": "git-branch",
        "prompt": "You want your pull request to contain only Phase 02 work. What should you do first?",
        "choices": [
            "Commit everything in the working tree to main",
            "Create a new branch from the Phase 01 baseline before editing",
            "Force-push main to overwrite history",
            "Delete the repository and clone again",
        ],
        "answer": 1,
        "topic": "git",
    },
]


def public_questions() -> list[dict]:
    return [{"id": q["id"], "prompt": q["prompt"], "choices": list(q["choices"])} for q in QUESTIONS]


def grade(answers: dict[str, int]) -> tuple[int, int]:
    total = len(QUESTIONS)
    score = sum(1 for q in QUESTIONS if answers.get(q["id"]) == q["answer"])
    return score, total
