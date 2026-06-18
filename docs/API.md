# Memlane API reference

`@memlane/mcp` is a thin MCP wrapper around Memlane's REST API. Every MCP tool maps to one or more HTTP calls on `https://api.memlane.io/v1/*`.

For **local MCP tool behavior** (parameters, return shapes, workflows), see [TOOLS.md](TOOLS.md).

The same tools are also available on the hosted remote MCP at `https://api.memlane.io/mcp` (OAuth, no API key). Remote search and capture are rate-limited per user.

## Authentication

Send your API key on every request:

```
Authorization: Bearer ml_live_…
```

Create keys in the app: **Manage → Connections → API keys**.

| Scope | Allows |
|-------|--------|
| `read` | List/get saves, search, list projects and topics |
| `write` | Create/update notes, tag saves, delete saves |
| `capture` | Save new URLs (`POST /v1/capture`) |

API keys issued from the app include all three scopes. Errors return JSON: `{ "error": "message" }`.

## Base URL

```
https://api.memlane.io
```

Override for self-hosted or staging with `MEMLANE_API_URL` when using the MCP package.

---

## MCP tools

Each tool returns JSON text in the MCP `content` field.

| MCP tool | REST endpoint(s) | Scope |
|----------|------------------|-------|
| `search_saves` | `POST /v1/search` | read |
| `list_saves` | `GET /v1/items` | read |
| `get_save` | `GET /v1/items/:id`, optionally `GET /v1/items/:id/content` | read |
| `capture_url` | `POST /v1/capture` | capture |
| `create_note` | `POST /v1/notes` | write |
| `update_note` | `PATCH /v1/notes/:id` | write |
| `list_projects` | `GET /v1/projects` | read |
| `list_topics` | `GET /v1/topics` | read |
| `add_topic_to_save` | `POST /v1/items/:id/topics` | write |
| `remove_topic_from_save` | `DELETE /v1/items/:id/topics` | write |

`DELETE /v1/items/:id` is available on the REST API but not exposed as an MCP tool.

### `search_saves`

Semantic search over your library (pgvector embeddings).

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Natural-language search query |
| `limit` | integer | no | 1–50, default 10 |

**REST:** `POST /v1/search`

```json
{ "query": "remote work policies", "limit": 10 }
```

**Response:** `{ "matches": [ … ] }` — each match is an item object plus `similarity` (0–1).

---

### `list_saves`

Browse saves, newest first. Supports cursor pagination.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | integer | no | 1–100, default 30 |
| `cursor` | string | no | Offset cursor from a previous `nextCursor` |
| `projectId` | UUID or `"general"` | no | Filter by project; `"general"` = no project |
| `topicName` | string | no | Filter by topic name |
| `kind` | `"link"` \| `"note"` | no | Filter by save type |
| `status` | `"pending"` \| `"ready"` \| `"error"` | no | Filter by enrichment status |
| `q` | string | no | Case-insensitive match on title or summary |

**REST:** `GET /v1/items?limit=30&cursor=0&…`

**Response:** `{ "items": [ … ], "nextCursor": "30" | null }`

---

### `get_save`

Fetch one save by id.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | yes | Save id |
| `includeContent` | boolean | no | If true, include full markdown body |

**REST:**

- `GET /v1/items/:id` — metadata and topics
- `GET /v1/items/:id/content` — `{ "markdown": "…" }` (links from R2, notes from Postgres)

When `includeContent` is true, the MCP tool merges metadata and `content` into one JSON object.

---

### `capture_url`

Save a URL. Enrichment (fetch, summarize, embed, classify) runs in the background.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string (URL) | yes | Page to save |
| `projectId` | UUID \| null | no | Project to file under |

**REST:** `POST /v1/capture`

```json
{ "url": "https://example.com/article", "projectId": null }
```

**Response:** `{ "item": { "id": "…", "status": "pending" } }`

Poll with `list_saves` or `get_save` until `status` becomes `ready` or `error`.

---

### `create_note`

Create a markdown note. Embedded immediately for search.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Note title |
| `content` | string | yes | Markdown body |
| `projectId` | UUID \| null | no | Project to file under |

**REST:** `POST /v1/notes`

```json
{ "title": "Meeting notes", "content": "# Summary\n…", "projectId": null }
```

**Response:** `{ "item": { "id": "…", "kind": "note", "status": "ready" } }`

---

### `update_note`

Update a note's title and/or body. Re-embeds for search when content changes.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | yes | Note id |
| `title` | string | no | New title |
| `content` | string | no | New markdown body |

At least one of `title` or `content` is required.

**REST:** `PATCH /v1/notes/:id`

```json
{ "title": "Updated title", "content": "…" }
```

**Response:** `{ "ok": true }`

---

### `list_projects`

**REST:** `GET /v1/projects`

**Response:** `{ "projects": [ { "id", "name", "description", "created_at" }, … ] }`

---

### `list_topics`

General topics (`project_id: null`) and project-scoped topics.

**REST:** `GET /v1/topics`

**Response:** `{ "topics": [ { "id", "name", "description", "project_id", "created_at" }, … ] }`

---

### `add_topic_to_save`

Attach a topic to a save.

**Input**

| Field | Type | Required |
|-------|------|----------|
| `itemId` | UUID | yes |
| `topicId` | UUID | yes |

**REST:** `POST /v1/items/:itemId/topics`

```json
{ "topicId": "…" }
```

**Response:** `{ "ok": true }`

---

### `remove_topic_from_save`

Remove a topic from a save.

**Input**

| Field | Type | Required |
|-------|------|----------|
| `itemId` | UUID | yes |
| `topicId` | UUID | yes |

**REST:** `DELETE /v1/items/:itemId/topics`

```json
{ "topicId": "…" }
```

**Response:** `{ "ok": true }`

---

## REST endpoints (direct use)

Call these directly with `curl`, scripts, or any HTTP client. Same auth header as above.

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/v1/items` | read | List saves (query params below) |
| `GET` | `/v1/items/:id` | read | Save metadata + topics |
| `GET` | `/v1/items/:id/content` | read | Markdown body |
| `POST` | `/v1/search` | read | Semantic search |
| `POST` | `/v1/capture` | capture | Save a URL |
| `POST` | `/v1/notes` | write | Create a note |
| `PATCH` | `/v1/notes/:id` | write | Update a note |
| `DELETE` | `/v1/items/:id` | write | Delete a save |
| `GET` | `/v1/projects` | read | List projects |
| `GET` | `/v1/topics` | read | List topics |
| `POST` | `/v1/items/:id/topics` | write | Attach topic (`{ topicId }`) |
| `DELETE` | `/v1/items/:id/topics` | write | Remove topic (`{ topicId }`) |

Key management (`POST /v1/api-keys`, `DELETE /v1/api-keys/:id`) requires a browser JWT, not an API key.

### Item object

List and detail responses use this shape (detail adds `error`, `is_public`, `share_token`):

```json
{
  "id": "uuid",
  "kind": "link",
  "url": "https://…",
  "title": "Article title",
  "summary": "One-line summary",
  "tldr": "Markdown overview",
  "status": "ready",
  "created_at": "2026-06-18T12:00:00Z",
  "project_id": "uuid or null",
  "project": { "id": "uuid", "name": "Research" },
  "topics": [{ "id": "uuid", "name": "AI" }]
}
```

`kind` is `"link"` or `"note"`. Link `status` flows `pending` → `ready` or `error` during enrichment.

### Example: search with curl

```bash
curl -s https://api.memlane.io/v1/search \
  -H "Authorization: Bearer ml_live_…" \
  -H "Content-Type: application/json" \
  -d '{"query": "product strategy", "limit": 5}'
```

### Example: capture with curl

```bash
curl -s https://api.memlane.io/v1/capture \
  -H "Authorization: Bearer ml_live_…" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/post"}'
```

---

## Errors

| HTTP status | Meaning |
|-------------|---------|
| 400 | Invalid input (bad UUID, missing field, invalid URL) |
| 401 | Missing or invalid API key / session |
| 403 | Insufficient scope |
| 404 | Save, note, or topic not found |
| 405 | Wrong HTTP method |
| 500 | Server or database error |

---

## Related

- [Setup guide](https://memlane.io/connections) (ChatGPT, Claude Desktop)
- [Developer guide](https://memlane.io/connections/developers) (host configs, remote MCP)
- [Memlane app](https://app.memlane.io)
