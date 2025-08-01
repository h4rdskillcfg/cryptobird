FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create database directory
RUN mkdir -p database

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Create startup script
RUN echo '#!/bin/sh\nnode scripts/init-db.js\nnode server.js' > /app/start.sh && \
    chmod +x /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["/app/start.sh"]