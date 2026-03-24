# ── Stage 1: Install production dependencies ─────────────────────────
FROM oven/bun:1-alpine AS install

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock* ./

# Install production-only dependencies
RUN bun install --frozen-lockfile --production

# ── Stage 2: Production release ──────────────────────────────────────
FROM oven/bun:1-alpine AS release

WORKDIR /app

# Copy production node_modules from install stage
COPY --from=install /app/node_modules ./node_modules

# Copy application source
COPY . .

ENV NODE_ENV=production

# Run as non-root user for security
USER bun

# Start the server
CMD ["bun", "run", "index.ts"]