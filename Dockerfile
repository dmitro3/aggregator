# syntax = docker/dockerfile:1.2

FROM node:lts-alpine AS base

ENV NODE_ENV="production"

RUN apk update -qq \
    && apk add --no-cache curl unzip bash ca-certificates \
    && curl -fsSL https://bun.sh/install | bash

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
    bun x turbo prune @rhiva-ag/trpc @rhiva-ag/worker @rhiva-ag/metrics --docker

FROM base as builder
WORKDIR /usr/src/app
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

COPY --from=codegen /usr/src/app/out/json .
RUN --mount=type=cache,target=/root/.bun/cache\
    bun install --frozen-lockfine

COPY --from=codegen /usr/src/app/out/full . 
RUN bun x turbo check

FROM base as runtime
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/ .

WORKDIR /usr/src/app/servers
ENV HOST="0.0.0.0"
ENV NODE_ENV=production

FROM runtime as trpc 
CMD ["bun", "trpc/src/index.ts"]

FROM runtime as tasks 
CMD ["bun", "worker/index.ts"]

FROM runtime as jobs
CMD ["bun", "worker/src/jobs/index.ts"]

FROM runtime as metrics 
CMD ["bun", "metrics/src/index.ts"]
