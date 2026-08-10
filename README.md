# Social Media Application

A fully-featured, production-grade RESTful and GraphQL API backend for a social media platform. Built with Node.js and TypeScript, the application supports user authentication, real-time messaging, media uploads, post and comment management, and third-party OAuth integration.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Getting Started](#getting-started)
- [API Design](#api-design)
- [Security](#security)

---

## Overview

This project serves as the backend for a social media platform, exposing both a RESTful HTTP API and a GraphQL endpoint. It is designed with scalability, modularity, and real-world production concerns in mind, including cloud storage, caching, real-time communication, and secure authentication flows.

---

## Tech Stack

### Runtime and Language

| Technology | Version | Purpose |
|---|---|---|
| Node.js | LTS | JavaScript runtime environment |
| TypeScript | ^6.0 | Static typing, improved developer experience and code reliability |

### Web Framework

| Technology | Version | Purpose |
|---|---|---|
| Express.js | ^5.2 | HTTP server framework, routing, and middleware orchestration |

### Database

| Technology | Version | Purpose |
|---|---|---|
| MongoDB | ^7.1 | Primary NoSQL document database for application data |
| Mongoose | ^9.3 | ODM layer for MongoDB — schema definition, validation, and query building |

### Caching

| Technology | Version | Purpose |
|---|---|---|
| Redis (via ioredis) | ^5.10 | In-memory caching for sessions, token invalidation, and performance optimization |
| Upstash Redis | — | Managed, serverless Redis instance for cloud deployment |

### API Layer

| Technology | Version | Purpose |
|---|---|---|
| GraphQL | ^16.13 | Declarative, flexible query language for API data fetching |
| graphql-http | ^1.22 | GraphQL over HTTP spec-compliant handler integrated with Express |

### Real-Time Communication

| Technology | Version | Purpose |
|---|---|---|
| Socket.IO | ^4.8 | WebSocket-based real-time bidirectional event communication for live chat |

### Authentication and Security

| Technology | Version | Purpose |
|---|---|---|
| JSON Web Tokens (jsonwebtoken) | ^9.0 | Stateless authentication via access and refresh token strategy |
| Argon2 | ^0.44 | Secure, memory-hard password hashing algorithm (modern alternative to bcrypt) |
| Google Auth Library | ^10.6 | OAuth 2.0 integration for Google Sign-In |
| Firebase Admin | ^13.8 | Google Firebase integration for push notifications |

### Cloud Storage

| Technology | Version | Purpose |
|---|---|---|
| AWS S3 (via @aws-sdk v3) | ^3.1035 | Cloud object storage for user-uploaded media (images, files) |
| AWS S3 Request Presigner | ^3.1035 | Generating secure, time-limited pre-signed URLs for direct client access |

### Email

| Technology | Version | Purpose |
|---|---|---|
| Nodemailer | ^8.0 | Transactional email delivery (verification, password reset, notifications) |

### File Uploads

| Technology | Version | Purpose |
|---|---|---|
| Multer | ^2.1 | Multipart/form-data handling for media file uploads |

### Validation

| Technology | Version | Purpose |
|---|---|---|
| Zod | ^4.3 | Runtime schema validation and type inference for request payloads |

### Developer Tooling

| Technology | Purpose |
|---|---|
| pnpm | Fast, disk-efficient package manager with workspace support |
| concurrently | Run TypeScript compiler and Node watcher in parallel during development |
| cross-env | Cross-platform environment variable management |
| dotenv | Environment variable loading from `.env` files |
| TypeScript type definitions | Type safety across all Node.js, Express, and third-party libraries |

---

## Architecture

The application follows a **modular, layered architecture** where each domain feature (auth, user, post, comment, chat) is encapsulated in its own module containing a controller, service, validation, and data model. Shared infrastructure (Redis, S3, email, JWT utilities) lives in a common layer consumed across all modules.

```
src/
├── app.bootstrap.ts      # Application entry — wires Express, DB connections, routes
├── main.ts               # Process entry point
├── DB/                   # Database connection setup
├── middleware/           # Global authentication and error handling middleware
├── common/
│   ├── config/           # Environment configuration
│   ├── services/         # Shared services (Redis, S3, email, JWT)
│   ├── utils/            # Utility helpers
│   ├── exceptions/       # Custom error classes
│   ├── validation/       # Shared validation schemas
│   └── interfaces/       # Shared TypeScript interfaces
└── modules/
    ├── auth/             # Registration, login, OAuth, token refresh
    ├── user/             # User profiles, follow system, settings
    ├── post/             # CRUD for posts, media handling
    ├── comment/          # Nested comments
    ├── chat/             # Direct messaging
    ├── graphql/          # GraphQL schema and resolvers
    └── realtime/         # Socket.IO gateway
```

---

## Core Features

- **Authentication**: Registration and login via email/password with Argon2 hashing. Google OAuth 2.0 sign-in. Access/refresh token rotation using JWT with Redis-backed invalidation.
- **User Management**: Profile management, avatar uploads to AWS S3 with pre-signed URL delivery.
- **Posts and Comments**: Full CRUD operations for posts with media attachments and a nested comment system.
- **Real-Time Chat**: One-to-one messaging powered by Socket.IO with persistent message storage in MongoDB.
- **GraphQL API**: A complementary GraphQL endpoint for flexible data querying alongside the REST API.
- **Email Notifications**: Transactional emails (account verification, password reset) via Nodemailer with Google App Password integration.
- **Caching**: Redis caching layer for improved read performance and token lifecycle management.
- **Input Validation**: All incoming requests are validated against strict Zod schemas before reaching business logic.
- **Error Handling**: Centralized global error handler with consistent JSON error responses and custom exception classes.

---

## Project Structure

```
SocialMediaApp/
├── src/                  # TypeScript source files
├── dist/                 # Compiled JavaScript output
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── .env.development
└── .env.production
```

---

## Environment Configuration

The application uses separate `.env` files per environment. The following keys are required:

| Variable | Description |
|---|---|
| `PORT` | HTTP server port |
| `DB_URI` | MongoDB connection string |
| `USER_TOKEN_SECRET_KEY` | JWT secret for access tokens |
| `USER_REFRESH_TOKEN_SECRET_KEY` | JWT secret for refresh tokens |
| `SYSTEM_TOKEN_SECRET_KEY` | JWT secret for system-level tokens |
| `ACCESS_TOKEN_EXPIRATION_TIME` | Access token TTL in seconds |
| `REFRESH_TOKEN_EXPIRATION_TIME` | Refresh token TTL in seconds |
| `REDIS_URL` | Redis connection URL |
| `WEB_CLIENT_ID` | Google OAuth client ID |
| `CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_EMAIL` | Gmail address for Nodemailer |
| `GOOGLE_APP_PASSWORD` | Gmail App Password for SMTP |
| `AWS_REGION` | AWS S3 region |
| `AWS_BUCKET_NAME` | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_EXPIRES_IN` | Pre-signed URL expiration in seconds |

---

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- pnpm (`npm install -g pnpm`)
- MongoDB instance (local or Atlas)
- Redis instance (local or Upstash)
- AWS S3 bucket
- Google Cloud OAuth credentials

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SocialMediaApp

# Install dependencies
pnpm install

# Copy and configure environment variables
cp .env.development .env
# Edit .env with your credentials
```

### Running the Application

```bash
# Development mode (TypeScript watch + Node watch)
pnpm run dev

# Production mode
pnpm run prod
```

The server starts on port `3100` by default.

---

## API Design

### REST Endpoints

| Prefix | Module | Description |
|---|---|---|
| `/auth` | Authentication | Register, login, OAuth, token refresh |
| `/user` | Users | Profile management, follows |
| `/post` | Posts | Create, read, update, delete posts |
| `/comment` | Comments | Comment threads on posts |
| `/chat` | Chat | Direct messaging between users |

### GraphQL

The GraphQL endpoint is available at `/graphql` and supports authenticated queries and mutations via the same JWT-based auth middleware applied to all REST routes.

---

## Security

- Passwords are hashed using **Argon2id**, a memory-hard hashing algorithm winner of the Password Hashing Competition.
- Authentication relies on short-lived **JWT access tokens** (30 minutes) with long-lived **refresh tokens** (1 year), using Redis for token invalidation upon logout.
- All request bodies are validated with **Zod** schemas, preventing malformed or malicious inputs from reaching service logic.
- CORS is configured globally with allowed origins specified per environment.
- AWS S3 media access is controlled via **pre-signed URLs**, ensuring objects are never publicly exposed directly.
- Google OAuth flow uses the official `google-auth-library` to verify ID tokens server-side.

---

## License

ISC
