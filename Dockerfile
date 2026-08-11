FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package manifests first for optimal docker cache
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Ensure upload directory exists with proper permissions
RUN mkdir -p public/uploads

# Expose port 3000
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start application
CMD ["npm", "start"]
