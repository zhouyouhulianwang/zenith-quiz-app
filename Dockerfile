# ZENITH Quiz App - Fullstack Docker Image
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the server
CMD ["node", "dist/boot.js"]
