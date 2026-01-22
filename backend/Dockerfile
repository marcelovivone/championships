# 1. Base image using Node 20
FROM node:20-alpine

# 2. Install necessary OS dependencies (OpenSSL is kept for stability)
RUN apk add --no-cache openssl

# 3. Set the working directory
WORKDIR /usr/src/app

# 4. Copy dependency files
COPY package*.json ./

# 5. Install project dependencies
RUN npm install

# 6. Copy the rest of the source code
COPY . .

# 7. Build the NestJS project
RUN npm run build

# 8. Expose the API port
EXPOSE 3000

# 9. Command to run the application in production mode
CMD ["npm", "run", "start:prod"]