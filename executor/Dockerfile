FROM node:20-bullseye-slim

# Install Python, C, C++, and Java (JDK 17)
RUN apt-get update && apt-get install -y \
    python3 \
    gcc \
    g++ \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Render expects web services to bind to a port
EXPOSE 8080
CMD ["node", "server.js"]
