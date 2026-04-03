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

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret for signing JWT tokens |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret |
| `GITHUB_CALLBACK_URL` | GitHub OAuth callback URL |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL |

OAuth is optional. If `GITHUB_CLIENT_ID` or `GOOGLE_CLIENT_ID` are not set, the corresponding login strategy is disabled and the server starts without it.

#### JWT Secret

Generate a secure random string:

```bash
openssl rand -hex 32
```

Put the result in `.env`:
```
JWT_SECRET=your-generated-string
```

#### GitHub OAuth

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the form:
   - **Application name**: `Claude Harness` (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3001/auth/github/callback`
4. Click **Register application**
5. Copy **Client ID** → set as `GITHUB_CLIENT_ID`
6. Click **Generate a new client secret** → copy and set as `GITHUB_CLIENT_SECRET`

```env
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
```

> For production, replace `localhost` URLs with your actual domain.

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Configure consent screen**:
   - Choose **External** user type
   - Fill in **App name**, **User support email**, **Developer contact email**
   - Add scopes: `email`, `profile`
   - Add your email to **Test users** (required while in testing mode)
   - Click **Save and Continue** through remaining steps
5. Go back to **Credentials** > **Create Credentials** > **OAuth client ID**
6. Choose **Web application** as the application type
7. Fill in:
   - **Name**: `Claude Harness`
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3001/auth/google/callback`
8. Click **Create**
9. Copy **Client ID** → set as `GOOGLE_CLIENT_ID`
10. Copy **Client secret** → set as `GOOGLE_CLIENT_SECRET`

```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
```

> Google OAuth requires the consent screen to be configured. While the app is in "Testing" mode, only users listed in the test users list can log in. To allow anyone, submit for verification or switch to "Internal" (Google Workspace only).

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
