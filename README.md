# otto-extensions

Built-in Otto extension modules package.

## What this repo does

This repo packages first-party Otto extension modules that are loaded by the runtime and used by other Otto services.

Current built-ins exported from src/index.ts:

- Example module scaffold
- Logging module
- Tracing module
- Metrics module

These modules provide baseline observability and extension wiring patterns for the rest of the ecosystem.

## Quick start

```bash
npm install
npm run typecheck
npm run test
npm run build
```

## Integration role

- Depends on otto-protocol for shared contracts
- Depends on otto-command-service for command plumbing
- Feeds module surfaces to runtime/server components

## When to use this repo

Use this repo when you need to add or evolve built-in extension behavior shared across Otto runtimes.
