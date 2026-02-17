# ==========================
# Base stage
# ==========================
FROM node:20-slim AS base

WORKDIR /app
COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# ==========================
# System deps for Chromium / Puppeteer
# ==========================
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatspi2.0-0 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    wget \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

# ==========================
# Install Node dependencies
# ==========================
RUN if [ "$NODE_ENV" = "development" ]; then \
      npm install; \
    else \
      if [ -f package-lock.json ]; then \
        npm ci --omit=dev; \
      else \
        npm install --omit=dev; \
      fi; \
    fi

# ==========================
# Copy source code
# ==========================
COPY . .

# ==========================
# Download Chromium for Puppeteer
# ==========================
RUN mkdir -p /app/.cache/puppeteer && \
    npx puppeteer browsers install chrome

# ==========================
# Create required directories
# ==========================
RUN mkdir -p /app/storage/documentos/candidatos \
    /app/storage/contratos \
    /app/storage/centros \
 && chmod -R 755 /app/storage

EXPOSE 3000

# ==========================
# Development stage
# ==========================
FROM base AS development
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# ==========================
# Production stage
# ==========================
FROM base AS production
ENV NODE_ENV=production
CMD ["npm", "start"]
