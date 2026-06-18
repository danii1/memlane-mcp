#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { apiDelete, apiGet, apiPatch, apiPost } from "./client.js"

const server = new McpServer({
  name: "memlane",
  version: "0.1.1",
})

server.registerTool(
  "search_saves",
  {
    description: "Semantic search over your saved links and notes in Memlane",
    inputSchema: {
      query: z.string().describe("Natural-language search query"),
      limit: z.number().int().min(1).max(50).optional(),
    },
  },
  async ({ query, limit }) => {
    const data = await apiPost<{ matches: unknown[] }>("/v1/search", {
      query,
      limit,
    })
    return {
      content: [{ type: "text", text: JSON.stringify(data.matches, null, 2) }],
    }
  },
)

server.registerTool(
  "list_saves",
  {
    description: "List saved links and notes, newest first",
    inputSchema: {
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
      projectId: z.string().optional(),
      topicName: z.string().optional(),
      kind: z.enum(["link", "note"]).optional(),
      status: z.enum(["pending", "ready", "error"]).optional(),
      q: z.string().optional().describe("Filter by title/summary text"),
    },
  },
  async (params) => {
    const qs = new URLSearchParams()
    if (params.limit) qs.set("limit", String(params.limit))
    if (params.cursor) qs.set("cursor", params.cursor)
    if (params.projectId) qs.set("projectId", params.projectId)
    if (params.topicName) qs.set("topicName", params.topicName)
    if (params.kind) qs.set("kind", params.kind)
    if (params.status) qs.set("status", params.status)
    if (params.q) qs.set("q", params.q)
    const suffix = qs.toString() ? `?${qs}` : ""
    const data = await apiGet<{ items: unknown[]; nextCursor: string | null }>(
      `/v1/items${suffix}`,
    )
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { items: data.items, nextCursor: data.nextCursor },
            null,
            2,
          ),
        },
      ],
    }
  },
)

server.registerTool(
  "get_save",
  {
    description:
      "Get a saved link or note by id, optionally including full markdown content",
    inputSchema: {
      id: z.string().uuid(),
      includeContent: z.boolean().optional(),
    },
  },
  async ({ id, includeContent }) => {
    const item = await apiGet<{ item: unknown }>(`/v1/items/${id}`)
    if (includeContent) {
      const content = await apiGet<{ markdown: string }>(
        `/v1/items/${id}/content`,
      )
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...item, content: content.markdown }, null, 2),
          },
        ],
      }
    }
    return {
      content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
    }
  },
)

server.registerTool(
  "capture_url",
  {
    description:
      "Save a URL to Memlane (background enrichment: extract, embed, classify)",
    inputSchema: {
      url: z.string().url(),
      projectId: z.string().uuid().nullable().optional(),
    },
  },
  async ({ url, projectId }) => {
    const data = await apiPost<{ item: unknown }>("/v1/capture", {
      url,
      projectId: projectId ?? null,
    })
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    }
  },
)

server.registerTool(
  "create_note",
  {
    description: "Create a markdown note in Memlane",
    inputSchema: {
      title: z.string(),
      content: z.string(),
      projectId: z.string().uuid().nullable().optional(),
    },
  },
  async ({ title, content, projectId }) => {
    const data = await apiPost<{ item: unknown }>("/v1/notes", {
      title,
      content,
      projectId: projectId ?? null,
    })
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    }
  },
)

server.registerTool(
  "update_note",
  {
    description: "Update a note's title and/or markdown body",
    inputSchema: {
      id: z.string().uuid(),
      title: z.string().optional(),
      content: z.string().optional(),
    },
  },
  async ({ id, title, content }) => {
    const data = await apiPatch<{ ok: boolean }>(`/v1/notes/${id}`, {
      title,
      content,
    })
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    }
  },
)

server.registerTool(
  "list_projects",
  { description: "List Memlane projects" },
  async () => {
    const data = await apiGet<{ projects: unknown[] }>("/v1/projects")
    return {
      content: [{ type: "text", text: JSON.stringify(data.projects, null, 2) }],
    }
  },
)

server.registerTool(
  "list_topics",
  { description: "List Memlane topics (general and project-scoped)" },
  async () => {
    const data = await apiGet<{ topics: unknown[] }>("/v1/topics")
    return {
      content: [{ type: "text", text: JSON.stringify(data.topics, null, 2) }],
    }
  },
)

server.registerTool(
  "add_topic_to_save",
  {
    description: "Attach a topic to a saved link or note",
    inputSchema: {
      itemId: z.string().uuid(),
      topicId: z.string().uuid(),
    },
  },
  async ({ itemId, topicId }) => {
    const data = await apiPost<{ ok: boolean }>(
      `/v1/items/${itemId}/topics`,
      { topicId },
    )
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    }
  },
)

server.registerTool(
  "remove_topic_from_save",
  {
    description: "Remove a topic from a saved link or note",
    inputSchema: {
      itemId: z.string().uuid(),
      topicId: z.string().uuid(),
    },
  },
  async ({ itemId, topicId }) => {
    const data = await apiDelete<{ ok: boolean }>(
      `/v1/items/${itemId}/topics`,
      { topicId },
    )
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    }
  },
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
