# Local MCP tools reference

The `@memlane/mcp` package runs as a **stdio MCP server** on your machine. Your AI host (Cursor, VS Code, Claude Code, Windsurf, etc.) spawns it with `npx @memlane/mcp` and passes `MEMLANE_API_KEY` in the environment.

This document describes the **functions (tools)** the server exposes: what each one does, when to use it, and what it returns.

For REST endpoint details and curl examples, see [API.md](API.md). Remote MCP (`https://api.memlane.io/mcp`) exposes the same tools over OAuth.

## How responses work

Every tool returns a single MCP text content block: **pretty-printed JSON**. On failure the server throws an error with the API message (e.g. `insufficient scope`, `not found`).

There is no streaming. Large markdown bodies are returned in full when you set `includeContent: true` on `get_save`.

## Quick reference

| Tool | Best for | Scope |
|------|----------|-------|
| `search_saves` | Find saves by meaning, not exact keywords | read |
| `list_saves` | Browse, filter, paginate | read |
| `get_save` | One save's metadata or full text | read |
| `capture_url` | Save a new link from the web | capture |
| `create_note` | Add a markdown note | write |
| `update_note` | Edit an existing note | write |
| `list_projects` | Resolve project names to ids | read |
| `list_topics` | Resolve topic names to ids | read |
| `add_topic_to_save` | Tag a save | write |
| `remove_topic_from_save` | Remove a tag | write |

**Not exposed as MCP tools:** delete a save (`DELETE /v1/items/:id` on the REST API only).

## Recommended workflows

**Answer a question from your library**

1. `search_saves` with a natural-language query.
2. `get_save` with `includeContent: true` on the best match(es).

**Browse a project or topic**

1. `list_projects` or `list_topics` if you need ids.
2. `list_saves` with `projectId`, `topicName`, or `kind` filters.
3. `get_save` for detail.

**Save something new**

- Link: `capture_url` → returns `status: "pending"`. Poll with `get_save` until `ready` or `error`.
- Note: `create_note` → immediately `status: "ready"` and searchable.

**Organize**

1. `list_topics` to find `topicId`.
2. `add_topic_to_save` or `remove_topic_from_save`.

## Save fields

Tools that return saves use this shape (list views omit `error`, `is_public`, `share_token`):

```json
{
  "id": "uuid",
  "kind": "link",
  "url": "https://example.com/post",
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

- `kind`: `"link"` or `"note"`.
- `status`: links go `pending` → `ready` or `error` during enrichment. Notes are `ready` immediately.
- `search_saves` adds `similarity` (0–1) on each match.

---

## `search_saves`

**Semantic search** over embedded link and note content. Prefer this over `list_saves` when the user asks a question in natural language.

### Parameters

| Name | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `query` | string | yes | | Natural-language query |
| `limit` | integer | no | 10 | 1–50 |

### Returns

JSON **array** of save objects, each with `similarity`. Sorted by relevance.

### Example prompts

- "Search my Memlane saves for articles about remote work"
- "What have I saved on PostgreSQL indexing?"

---

## `list_saves`

**Browse** saves, newest first. Use filters and cursor pagination when search is too broad or you need an exact slice (e.g. all notes in a project).

### Parameters

| Name | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `limit` | integer | no | 30 | 1–100 |
| `cursor` | string | no | | Pass `nextCursor` from a previous call |
| `projectId` | string | no | | UUID, or `"general"` for saves with no project |
| `topicName` | string | no | | Exact topic name filter |
| `kind` | `"link"` \| `"note"` | no | | Save type |
| `status` | `"pending"` \| `"ready"` \| `"error"` | no | | Enrichment status |
| `q` | string | no | | Substring match on title or summary |

### Returns

```json
{
  "items": [ /* save objects */ ],
  "nextCursor": "30"
}
```

`nextCursor` is `null` when there are no more pages.

### Example prompts

- "List my 10 most recent saves"
- "Show pending captures in my Website project"
- "List all notes tagged AI"

---

## `get_save`

Fetch **one save** by id. Use `includeContent: true` when you need the full markdown body (article text or note content).

### Parameters

| Name | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `id` | UUID | yes | | Save id |
| `includeContent` | boolean | no | false | Fetch markdown from storage |

### Returns

Without content:

```json
{ "item": { /* save object with error, is_public, share_token */ } }
```

With content:

```json
{
  "item": { /* save object */ },
  "content": "# Full markdown…"
}
```

### Example prompts

- "Get the full text of save `abc-…`"
- "Show me metadata for my latest capture"

---

## `capture_url`

**Save a URL** to Memlane. Extraction, summary, embedding, and topic classification run in the background.

### Parameters

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `url` | string (URL) | yes | Must be a valid URL |
| `projectId` | UUID \| null | no | File under a project |

### Returns

```json
{
  "item": {
    "id": "uuid",
    "status": "pending"
  }
}
```

Tell the user enrichment is async. Use `get_save` later to read `title`, `summary`, `tldr`, and topics once `status` is `ready`.

### Example prompts

- "Capture https://example.com/article to Memlane"
- "Save this link to my Research project"

---

## `create_note`

Create a **markdown note**. Embedded immediately so it appears in `search_saves`.

### Parameters

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `title` | string | yes | |
| `content` | string | yes | Markdown body |
| `projectId` | UUID \| null | no | |

### Returns

```json
{
  "item": {
    "id": "uuid",
    "kind": "note",
    "status": "ready"
  }
}
```

### Example prompts

- "Create a note titled Meeting notes with …"
- "Add a Memlane note summarizing today's standup"

---

## `update_note`

Update a note's **title** and/or **content**. Re-embeds when the body changes.

### Parameters

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `id` | UUID | yes | Must be a note, not a link |
| `title` | string | no | At least one of `title` or `content` |
| `content` | string | no | |

### Returns

```json
{ "ok": true }
```

### Example prompts

- "Append this paragraph to note `abc-…`"
- "Rename my standup note to Weekly sync"

---

## `list_projects`

List all Memlane **projects** for the authenticated user.

### Parameters

None.

### Returns

JSON **array** of projects:

```json
[
  {
    "id": "uuid",
    "name": "Research",
    "description": null,
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

Use `id` as `projectId` in `capture_url`, `create_note`, or `list_saves`.

---

## `list_topics`

List **topics** (general and project-scoped). General topics have `project_id: null`.

### Parameters

None.

### Returns

JSON **array** of topics:

```json
[
  {
    "id": "uuid",
    "name": "AI",
    "description": null,
    "project_id": null,
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

Use `id` as `topicId` in `add_topic_to_save` / `remove_topic_from_save`. Filter saves by name with `list_saves` + `topicName`.

---

## `add_topic_to_save`

Attach a topic to a save.

### Parameters

| Name | Type | Required |
|------|------|----------|
| `itemId` | UUID | yes |
| `topicId` | UUID | yes |

### Returns

```json
{ "ok": true }
```

### Example prompts

- "Tag save `abc-…` with the AI topic"

---

## `remove_topic_from_save`

Remove a topic from a save.

### Parameters

| Name | Type | Required |
|------|------|----------|
| `itemId` | UUID | yes |
| `topicId` | UUID | yes |

### Returns

```json
{ "ok": true }
```

---

## Errors

| Message (typical) | Cause |
|-------------------|-------|
| `MEMLANE_API_KEY is required` | Key missing from host env config |
| `insufficient scope` | API key missing read/write/capture for that action |
| `not found` | Invalid id or save belongs to another user |
| `not a note` | `update_note` called on a link |
| `query is required` | Empty `search_saves` query |
| `invalid url` | Malformed URL in `capture_url` |

Revoke and recreate API keys in **Manage → Connections → API keys** if a key is compromised.

## Related

- [README](../README.md) — install and host configuration
- [API.md](API.md) — REST mappings, curl, auth scopes
- [memlane.io/connections/developers](https://memlane.io/connections/developers) — remote MCP + host setup
