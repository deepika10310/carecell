FROM python:3.12-slim

ENV POETRY_VERSION=2.1.3 \
    POETRY_VIRTUALENVS_CREATE=false \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir "poetry==$POETRY_VERSION"
COPY pyproject.toml ./
RUN poetry install --no-root --only main

COPY . .

EXPOSE 8000
CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
