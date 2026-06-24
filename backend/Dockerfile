FROM oven/bun:1 AS base
WORKDIR /app

# Install docker CLI
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy configurations and source code
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src

# Expose server port
EXPOSE 4000

# Set environment
ENV NODE_ENV=production

# Start Elysia backend server
CMD ["bun", "run", "src/index.ts"]
