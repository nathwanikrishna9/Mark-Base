FROM python:3.12-slim

WORKDIR /app

# Only install lightweight runtime libs (no cmake, no dlib build tools)
RUN apt-get update && apt-get install -y \
    libpq5 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (no dlib / face_recognition)
COPY requirements-no-face.txt .
RUN pip install --no-cache-dir -r requirements-no-face.txt

COPY . .

# Use shell form so $PORT is expanded at runtime (Railway sets PORT=8080)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
