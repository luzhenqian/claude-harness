# Claude Harness API

NestJS backend for the Claude Harness AI chatbot, providing Agent-based RAG to answer questions about Claude Code source code and articles.

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy env file and configure
cp .env.example .env

# Create database + pgvector extension
createdb claude-harness
psql -d claude-harness -c "CREATE EXTENSION IF NOT EXISTS vector"

# Build and run migration
pnpm build
# (migration runs automatically on first start, or use the SQL in src/migrations/)

# Start dev server
pnpm dev
```

## Environment Variables

### Database

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL (takes priority) | `postgresql://noah@localhost:5432/claude-harness` |
| `DATABASE_HOST` | DB host (fallback if no URL) | `localhost` |
| `DATABASE_PORT` | DB port | `5432` |
| `DATABASE_NAME` | DB name | `claude_harness` |
| `DATABASE_USER` | DB user | `postgres` |
| `DATABASE_PASSWORD` | DB password | `postgres` |

PostgreSQL must have the `pgvector` extension installed:
```bash
# On macOS with Homebrew
brew install pgvector

# Enable in database
psql -d claude-harness -c "CREATE EXTENSION IF NOT EXISTS vector"
```

### Authentication (OAuth)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `JWT_SECRET` | Secret for signing JWT tokens | Generate a random string: `openssl rand -hex 32` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | [github.com/settings/developers](https://github.com/settings/developers) > New OAuth App |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Secret | Same page as above |
| `GITHUB_CALLBACK_URL` | GitHub OAuth callback | `http://localhost:3001/auth/github/callback` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) > Create OAuth client |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | Same page as above |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback | `http://localhost:3001/auth/google/callback` |

OAuth is optional. If `GITHUB_CLIENT_ID` or `GOOGLE_CLIENT_ID` are not set, the corresponding login strategy is disabled and the server starts without it.

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `FRONTEND_URL` | Frontend origin for CORS + OAuth redirect | `http://localhost:3000` |

### LLM Providers

LLM providers are configured in the `llm_providers` database table, not via env vars. This allows runtime configuration of multiple providers.

```sql
-- Example: Add an OpenAI-compatible provider with custom base URL
INSERT INTO llm_providers (name, type, model, api_key, base_url, is_default, enabled)
VALUES ('openai', 'chat', 'claude-sonnet-4-6', 'sk-your-api-key', 'https://api.vectorengine.ai/v1', true, true);

-- Example: Add OpenAI native
INSERT INTO llm_providers (name, type, model, api_key, is_default, enabled)
VALUES ('openai', 'chat', 'gpt-4o', 'sk-your-openai-key', true, true);

-- Example: Add embedding provider (required for RAG indexing)
INSERT INTO llm_providers (name, type, model, api_key, is_default, enabled)
VALUES ('openai', 'embedding', 'text-embedding-3-small', 'sk-your-openai-key', true, true);
```

Table columns:
- `name`: Provider type — `openai` | `anthropic` | `gemini`
- `type`: `chat` (for conversations) or `embedding` (for vector generation)
- `model`: Model ID (e.g., `gpt-4o`, `claude-sonnet-4-6`, `gemini-2.5-pro`)
- `api_key`: API key for the provider
- `base_url`: Custom API base URL (optional, for OpenAI-compatible proxies)
- `is_default`: Set `true` for the default provider of each type
- `enabled`: Set `false` to disable without deleting

**Important:** Embedding and chat providers are independent. You need at least one of each type for full functionality. The embedding model must stay consistent — changing it requires re-indexing all content.

## API Endpoints

### Auth
- `GET /auth/github` — GitHub OAuth login
- `GET /auth/github/callback` — GitHub callback
- `GET /auth/google` — Google OAuth login
- `GET /auth/google/callback` — Google callback
- `GET /auth/me` — Current user info (requires JWT)
- `POST /auth/logout` — Logout

### Chat (requires JWT)
- `GET /conversations` — List conversations
- `POST /conversations` — Create conversation
- `DELETE /conversations/:id` — Delete conversation
- `PATCH /conversations/:id` — Update conversation title
- `GET /conversations/:id/messages` — Get message history
- `POST /conversations/:id/messages` — Send message (returns SSE stream)

### Admin
- `POST /admin/index/code` — Trigger source code indexing
- `POST /admin/index/articles` — Trigger article indexing
- `GET /admin/index/status` — View index status

## Indexing

```bash
# Index all (source code + articles)
pnpm index:all

# Index only source code
pnpm index:code

# Index only articles
pnpm index:articles

# Force re-index (ignore content hash)
pnpm index:all -- --force
```

Requires an embedding provider configured in the database.

## Development

```bash
pnpm dev          # Start with hot reload
pnpm build        # Production build
pnpm start        # Start production
npx vitest run    # Run tests
```
