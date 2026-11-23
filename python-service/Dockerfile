FROM mcr.microsoft.com/playwright/python:v1.55.0-noble

WORKDIR /app
COPY requirements.txt .
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get purge -y gstreamer1.0-plugins-bad libgstreamer-plugins-bad1.0-0 \
    && python -m pip uninstall --break-system-packages -y virtualenv \
    && python -m venv --without-pip /opt/venv \
    && python -m pip --python /opt/venv/bin/python install --no-cache-dir -r requirements.txt \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/venv/bin:$PATH"

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
