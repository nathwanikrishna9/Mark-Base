FROM python:3.12-slim

WORKDIR /app

# Install system dependencies needed for dlib (face_recognition), opencv-headless and psycopg2
RUN apt-get update && apt-get install -y \
    libpq5 \
    postgresql-client \
    gcc \
    g++ \
    cmake \
    build-essential \
    libpq-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libboost-python-dev \
    libboost-thread-dev \
    && rm -rf /var/lib/apt/lists/*

# Set CMake policy flag so dlib's bundled pybind11 (which uses cmake_minimum_required < 3.5)
# can still compile against CMake 3.30+
ENV CMAKE_ARGS="-DCMAKE_POLICY_VERSION_MINIMUM=3.5"
ENV DLIB_NO_GUI_SUPPORT=1

# Install dlib separately first (slow compile step - cached unless requirements change)
RUN pip install --no-cache-dir dlib==19.24.4

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use shell form so $PORT is expanded at runtime (Railway sets PORT=8080)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

