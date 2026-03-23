FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for dlib + face_recognition
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libboost-python-dev \
    libpq5 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (includes face_recognition)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install dlib + face_recognition separately (requires cmake)
RUN pip install --no-cache-dir dlib==19.24.6 face-recognition==1.3.0

COPY . .

# Use shell form so $PORT is expanded at runtime (Railway sets PORT=8080)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
