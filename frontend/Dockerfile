FROM node:20-alpine

WORKDIR /app

# Install dependencies (skip Puppeteer downloads to avoid hanging)
COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install

# Copy application files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5173/ || exit 1

# Run Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
