FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# Build context is the repository root (compose: context .., Railway: root
# directory repo root with dockerfilePath api/Dockerfile) so the versioned
# curriculum can be baked into the image — the seed needs it at boot and
# there is no curriculum mount on hosted platforms.
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ .
COPY curriculum/ /curriculum/
RUN chmod +x /app/docker-entrypoint.sh
ENTRYPOINT ["/app/docker-entrypoint.sh"]
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
