# Use Node.js 20 alpine for a lightweight production image
FROM node:20-alpine

# Set to production environment
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Copying package.json and package-lock.json first for better caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
# Note: we should ignore files like .git and node_modules via .dockerignore
COPY . .

# Expose the API port
EXPOSE 5001

# Command to run the application
CMD [ "npm", "start" ]
