# Base image
FROM node:16

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables (you can also manage these with .env files or Docker secrets)
ENV PORT=3000

# Command to run the application
CMD ["node", "notificationService.js"]
