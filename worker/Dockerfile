FROM python:3.11-slim

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user FIRST (CRITICAL: before installing Playwright)
RUN useradd -m -u 1001 worker

# Set working directory and ownership
WORKDIR /app
RUN chown -R worker:worker /app

# Switch to worker user BEFORE installing Playwright
USER worker

# Copy requirements as worker user
COPY --chown=worker:worker requirements.txt .

# Install Python dependencies as worker user
RUN pip install --no-cache-dir --user -r requirements.txt

# CRITICAL: Install Playwright browsers as worker user
# This ensures browsers are installed in /home/worker/.cache/ms-playwright
RUN /home/worker/.local/bin/playwright install chromium

# Copy worker code
COPY --chown=worker:worker . .

# Make sure PATH includes user's local bin
ENV PATH="/home/worker/.local/bin:${PATH}"

CMD ["python", "worker.py"]
