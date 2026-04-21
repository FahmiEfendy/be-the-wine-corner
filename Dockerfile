# Use Node.js 20 alpine for a lightweight image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Copying package.json and package-lock.json first for better caching
COPY package*.json ./

RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5001

# Command to run the application
CMD [ "npm", "start" ]
