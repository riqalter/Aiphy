FROM oven/bun:1 AS base
WORKDIR /app

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
