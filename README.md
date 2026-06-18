# @memlane/mcp

Connect [Memlane](https://memlane.io), your personal library of saved links and notes, to AI assistants that support local MCP servers.

## Prerequisites

1. A [Memlane](https://app.memlane.io) account
2. An API key from **Manage → Connections → API keys** in the app
3. [Node.js](https://nodejs.org/) 18+ (for `npx`)

## Configuration

This server runs locally via stdio. Most compatible hosts use the same JSON shape:

```json
{
  "mcpServers": {
    "memlane": {
      "command": "npx",
      "args": ["-y", "@memlane/mcp"],
      "env": {
        "MEMLANE_API_KEY": "ml_live_…"
      }
    }
  }
}
```

| Variable | Required | Default |
|----------|----------|---------|
| `MEMLANE_API_KEY` | Yes | — |
| `MEMLANE_API_URL` | No | `https://api.memlane.io` |

After `npm install -g @memlane/mcp`, you can use `"command": "memlane-mcp"` instead of `npx`.

## Supported hosts

| Host | Where to add the config |
|------|-------------------------|
| [Cursor](https://docs.cursor.com/context/mcp) | Settings → MCP, or `.cursor/mcp.json` in a project |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code/mcp) | `claude mcp add memlane -- npx -y @memlane/mcp` (pass `-e MEMLANE_API_KEY=…`) |
| [Windsurf](https://docs.windsurf.com/windsurf/cascade/mcp) | `~/.codeium/windsurf/mcp_config.json` |
| [VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) + Copilot | `.vscode/mcp.json` — see below |
| [Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html) | `~/.gemini/settings.json` |

For **ChatGPT** and **Claude Desktop**, use the [remote MCP endpoint](https://memlane.io/connections) instead (OAuth, no API key).

Restart the host app after editing config files.

### VS Code

VS Code uses `"servers"` as the root key (not `"mcpServers"`):

```json
{
  "servers": {
    "memlane": {
      "command": "npx",
      "args": ["-y", "@memlane/mcp"],
      "env": {
        "MEMLANE_API_KEY": "ml_live_…"
      }
    }
  }
}
```

Enable MCP in VS Code settings: `"chat.mcp.enabled": true`.

## ChatGPT and remote MCP hosts

ChatGPT, Claude Desktop, Claude on the web, and other **remote** MCP clients cannot run `npx`. Use Memlane's hosted endpoint instead:

**URL:** `https://api.memlane.io/mcp`

1. In your AI app, add a custom MCP connector with that URL.
2. Complete the OAuth sign-in flow (Memlane account — magic link or future social providers).
3. Approve access on the consent screen.

No API key required. Disconnect by removing the connector in your AI app's settings.

## Tools

| Tool | Description |
|------|-------------|
| `search_saves` | Semantic search over your library |
| `list_saves` | Browse saves with filters (project, topic, kind, status) |
| `get_save` | Fetch metadata; optional full markdown body |
| `capture_url` | Save a URL (enrichment runs in the background) |
| `create_note` / `update_note` | Create or edit markdown notes |
| `list_projects` / `list_topics` | List projects and topics |
| `add_topic_to_save` / `remove_topic_from_save` | Tag or untag a save |

## Security

API keys are secrets. Store them in your MCP host's environment config — never commit them to version control. Revoke a leaked key in **Manage → Connections → API keys**.

## License

MIT
