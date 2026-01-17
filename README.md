# ICA Operations Platform

<div align="center">

![Indian Chess Academy](https://img.shields.io/badge/Indian%20Chess%20Academy-Operations%20Platform-003366?style=for-the-badge&logo=chess.com&logoColor=white)

**Hackathon Edition** | January 18, 2026

*Building the Future of Chess Education Operations*

[![Built with Turborepo](https://img.shields.io/badge/Built%20with-Turborepo-EF4444?style=flat-square)](https://turbo.build/repo)
[![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1?style=flat-square&logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)

</div>

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| **Bun** | 1.1+ | [bun.sh](https://bun.sh) |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) |
| **Docker Desktop** | Latest | [docker.com](https://docker.com/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Delulu-Devs/ica-ops-platform.git
cd ica-ops-platform

# 2. Install dependencies
bun install

# 3. Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# 4. Setup environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/server/.env.example apps/server/.env

# 5. Run database migrations
bun run db:migrate

# 6. Seed the database with sample data
bun run db:seed

# 7. Start development servers
bun run dev
```

### Access Points

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API Server** | http://localhost:3001 |
| **Drizzle Studio** | `bun run db:studio` |

---

## 📁 Project Structure

```
ica-ops-platform/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── features/       # Feature-specific components
│   │   │   └── layouts/        # Layout components
│   │   ├── lib/                # Utilities & configs
│   │   │   └── trpc/           # tRPC client setup
│   │   └── public/             # Static assets
│   │
│   └── server/                 # Hono + tRPC backend
│       ├── src/
│       │   ├── routers/        # tRPC routers
│       │   ├── services/       # Business logic
│       │   ├── db/             # Drizzle schema & migrations
│       │   └── socket/         # Socket.io handlers
│       └── Dockerfile
│
├── packages/
│   ├── shared/                 # Shared types, constants, utils
│   ├── ui/                     # Shared UI components
│   ├── config/                 # Shared configuration
│   ├── eslint-config/          # ESLint configurations
│   └── typescript-config/      # TypeScript configurations
│
├── docs/                       # Project documentation
│   ├── API_SPECIFICATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── DESIGN_SYSTEM.md
│   ├── HACKATHON_STRATEGY.md
│   ├── SETUP_GUIDE.md
│   ├── USER_FLOWS.md
│   └── WIREFRAMES.md
│
├── PRD.md                      # Product Requirements Document
├── docker-compose.yml          # Development infrastructure
├── turbo.json                  # Turborepo configuration
└── package.json                # Root package configuration
```

---

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5.7** - Type-safe development
- **TanStack Query v5** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS v4** - Utility-first CSS
- **shadcn/ui** - Accessible component library
- **Framer Motion** - Animations

### Backend
- **Hono** - Ultra-fast web framework
- **tRPC 11** - End-to-end type-safe APIs
- **Drizzle ORM** - Type-safe SQL ORM
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching & pub/sub
- **Socket.io** - Real-time communication

### DevOps
- **Turborepo** - Monorepo build system
- **Bun** - JavaScript runtime & package manager
- **Docker** - Containerization
- **Biome** - Linting & formatting

---

## 📜 Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all apps in development mode |
| `bun run build` | Build all apps for production |
| `bun run lint` | Lint all packages |
| `bun run format` | Format all code |
| `bun run typecheck` | Type-check all packages |
| `bun run clean` | Clean all build artifacts |

### Database

| Command | Description |
|---------|-------------|
| `bun run db:generate` | Generate migration from schema changes |
| `bun run db:migrate` | Run pending migrations |
| `bun run db:push` | Push schema to DB (dev only) |
| `bun run db:seed` | Seed database with sample data |
| `bun run db:studio` | Open Drizzle Studio |

### Testing

| Command | Description |
|---------|-------------|
| `bun run test` | Run all tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Run tests with coverage |
| `bun run test:e2e` | Run E2E tests |

### Individual Apps

```bash
# Run only frontend
bun run --filter web dev

# Run only backend
bun run --filter @ica/server dev

# Build specific app
bun run --filter web build
```

---

## 🐳 Docker Setup

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset databases (delete volumes)
docker-compose down -v
docker-compose up -d
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PRD.md](./PRD.md) | Complete Product Requirements Document |
| [API Specification](./docs/API_SPECIFICATION.md) | tRPC routers and endpoints |
| [Database Schema](./docs/DATABASE_SCHEMA.md) | Entity definitions and relationships |
| [Design System](./docs/DESIGN_SYSTEM.md) | UI/UX guidelines and brand colors |
| [User Flows](./docs/USER_FLOWS.md) | User journey diagrams |
| [Wireframes](./docs/WIREFRAMES.md) | UI mockups and layouts |
| [Setup Guide](./docs/SETUP_GUIDE.md) | Detailed setup instructions |
| [Hackathon Strategy](./docs/HACKATHON_STRATEGY.md) | Development timeline and priorities |

---

## 👥 Team Roles

| Role | Responsibilities |
|------|------------------|
| **Frontend** | Next.js pages, components, UI/UX |
| **Backend** | tRPC routers, business logic, database |
| **Full Stack** | Integration, Socket.io, testing |
| **DevOps** | Docker, deployment, CI/CD |

---

## 🔑 Test Credentials (After Seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ica.com | admin123 |
| Coach | coach@ica.com | coach123 |
| Parent | parent@ica.com | parent123 |

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run linting: `bun run lint`
4. Run tests: `bun run test`
5. Commit with conventional commits: `git commit -m "feat(scope): description"`
6. Push and create a PR

---

<div align="center">

**Built with ❤️ for the Indian Chess Academy**

*May the best code win! ♟️*

</div>
