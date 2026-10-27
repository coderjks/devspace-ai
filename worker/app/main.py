"""Phase 01 worker stub.

Real evaluation/model jobs are implemented in Phase 06. This process only
verifies Redis connectivity and idles so Docker Compose health is observable.
No student code is executed here.
"""
import os
import time

import redis


def main() -> None:
    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    client = redis.from_url(url)
    print("worker: starting (Phase 01 stub, no jobs)", flush=True)
    while True:
        try:
            client.ping()
        except Exception as exc:  # noqa: BLE001
            print(f"worker: redis ping failed: {exc}", flush=True)
        time.sleep(30)


if __name__ == "__main__":
    main()
