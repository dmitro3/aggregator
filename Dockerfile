# syntax = docker/dockerfile:1.2

FROM node:lts-alpine AS base

ENV NODE_ENV="production"
RUN apk update -qq && \
    apk add build-base pkgconf ca-certificates

RUN apk add --no-cache curl unzip bash \
    && curl -fsSL https://bun.sh/install | bash \
    && export BUN_INSTALL="/root/.bun" \
    && export PATH="$BUN_INSTALL/bin:$PATH"

ENV PATH="/root/.bun/bin:$PATH"

FROM base as codegen
WORKDIR /usr/src/app

# Copy source code
COPY packages ./packages
COPY servers ./servers
COPY turbo.json ./turbo.json
COPY bun.lock ./bun.lock
COPY package.json ./package.json

# Run turbo prune for docker build
RUN bun install turbo --global && \
    bun x turbo prune @rhiva-ag/trpc @rhiva-ag/worker --docker

FROM base as builder
WORKDIR /usr/src/app
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

# Install node modules
COPY --from=codegen /usr/src/app/out/json .
RUN bun install --global pm2 turbo
RUN bun --mount=type=cache,target=/root/.bun/cache install --frozen-lockfine

# Build application
COPY --from=codegen /usr/src/app/out/full . 
COPY --from=codegen /usr/src/app/servers/ecosystem.config.js servers/ecosystem.config.js 
RUN bun x turbo build && bun x turbo check

FROM base as runner 
WORKDIR /usr/src/app

# Copy built application f
COPY --from=builder /usr/src/app/ .
COPY --from=builder /usr/src/app/servers/bot/intl servers/bot/dist/intl

WORKDIR /usr/src/app/servers

ENV HOST="0.0.0.0"
ENV NODE_ENV=production

CMD ["bun", "x", "pm2-runtime", "start", "ecosystem.config.js"]
