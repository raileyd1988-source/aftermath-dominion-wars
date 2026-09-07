# Development Guide

## Project Setup

### Prerequisites
- Node.js 16+
- npm or yarn
- Git

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## Architecture Overview

### Core Systems

1. **Game Systems** (`src/game/`)
   - Building and construction
   - Resource management
   - Troop training and formations
   - Research and technology trees
   - Combat and marching

2. **Server** (`src/server/`)
   - Database layer
   - API endpoints
   - Real-time events (WebSocket)
   - Authentication
   - Alliance management

3. **Client** (`src/client/`)
   - UI components
   - Game rendering
   - User input handling
   - Local state management

4. **Shared** (`src/shared/`)
   - Constants and enums
   - Type definitions
   - Utility functions
   - Validation schemas

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Building for Production

```bash
npm run build
```

## Code Standards

- Use TypeScript for type safety
- Follow ESLint configuration
- Write tests for new features
- Document complex logic

## Git Workflow

1. Create feature branch from `main`
2. Make changes and commit
3. Create pull request
4. Code review and testing
5. Merge to `main`

## Release Process

See [RELEASE.md](./RELEASE.md) for version management and deployment procedures.
