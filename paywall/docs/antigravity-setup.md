# Antigravity Setup

Antigravity shares MCP configuration across projects in `~/.gemini/config/mcp_config.json`.
To set up this project's MCP servers, add the following to your global config:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_GITHUB_TOKEN>"
      }
    }
  }
}
```

**Note:** Never paste your actual GitHub token into this document. Replace `<YOUR_GITHUB_TOKEN>` with your token directly in the `mcp_config.json` file.
