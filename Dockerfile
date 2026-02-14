# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source files
COPY . .

# Build client (Vite handles TypeScript natively)
RUN npx vite build

# Build server with esbuild directly (bypass tsx which fails on Alpine)
RUN node --input-type=commonjs -e " \
  const esbuild = require('esbuild'); \
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8')); \
  const allDeps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]; \
  const allowlist = ['@google/generative-ai','axios','bcryptjs','connect-pg-simple','cors','csrf-csrf','date-fns','drizzle-orm','drizzle-zod','express','express-rate-limit','express-session','helmet','jsonwebtoken','memorystore','multer','nanoid','nodemailer','openai','passport','passport-local','pg','stripe','uuid','ws','xlsx','zod','zod-validation-error']; \
  const externals = allDeps.filter(d => !allowlist.includes(d)); \
  esbuild.build({ \
    entryPoints: ['server/index.ts'], \
    platform: 'node', \
    bundle: true, \
    format: 'cjs', \
    outfile: 'dist/index.cjs', \
    define: { 'process.env.NODE_ENV': '"production"' }, \
    minify: true, \
    external: externals, \
    logLevel: 'info' \
  }).then(() => { console.log('Server build done'); }).catch((e) => { console.error(e); process.exit(1); }); \
"

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "dist/index.cjs"]
