# apps/api/Dockerfile
FROM python:3.12-slim

# Set environment variables to prevent Python from writing .pyc files and to buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required for asyncpg and other native extensions
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the actual application code
COPY . .

# Expose the port FastAPI will run on
EXPOSE 8000

