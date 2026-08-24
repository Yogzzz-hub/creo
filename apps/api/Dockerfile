# # apps/api/Dockerfile
# FROM python:3.12-slim

# # Set environment variables to prevent Python from writing .pyc files and to buffer stdout
# ENV PYTHONDONTWRITEBYTECODE=1
# ENV PYTHONUNBUFFERED=1

# WORKDIR /app

# # Install system dependencies required for asyncpg and other native extensions
# RUN apt-get update \
#     && apt-get install -y --no-install-recommends gcc libpq-dev build-essential \
#     && rm -rf /var/lib/apt/lists/*

# # Install Python dependencies
# COPY requirements.txt .
# RUN pip install --upgrade pip \
#     && pip install --no-cache-dir -r requirements.txt

# # Copy the actual application code
# COPY . .

# # Expose the port FastAPI will run on
# EXPOSE 8000



# new code 


# apps/api/Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies with non-interactive frontend to prevent build hangs
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway overrides this dynamically via railway.json)
EXPOSE 8080

# Fallback start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

