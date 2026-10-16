# Deploy Navigator Localization 719 Engine v0.2.2 on Render

## Purpose

Deploy the deterministic calculation engine extracted from Navigator HTML 0.7 as a remote Streamable HTTP MCP server.

The service does **not** determine legal applicability by itself. The ChatGPT plugin skill remains responsible for selecting and verifying the PP No. 719 position. The service only calculates prepared branches after classification is confirmed.

## Render settings

The repository includes `render.yaml`.

Expected service settings:

- Runtime: Node
- Node: 20.19.0 or compatible Node 20+
- Build command: `npm ci || npm install`
- Start command: `npm start`
- Health check: `/health`
- MCP endpoint after deployment: `https://<render-host>/mcp`

## Verification after deployment

1. Open `https://<render-host>/health`.
2. Confirm:
   - `ok: true`
   - `engineVersion: 0.7.0`
   - `serviceVersion: 0.2.2`
   - prepared rule IDs are returned.
3. Use an MCP client to connect to `https://<render-host>/mcp`.
4. Confirm the following tools are discoverable:
   - `engine_health`
   - `search_localization_rules`
   - `get_localization_rule`
   - `get_threshold_context`
   - `calculate_localization`
5. Run the Coriolis boundary test: `mountedPercent=69.9999` must fail the 70% criterion; `70` may pass when all other facts are valid.

## Plugin connection

After the final HTTPS endpoint exists, add root `mcp.json` to the existing private Agent Plugin:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "navigator-719-engine": {
      "type": "streamable-http",
      "url": "https://<render-host>/mcp"
    }
  }
}
```

Do not place API keys or secrets in `mcp.json`. Agent Plugins v1 does not treat configured headers as a secret mechanism.

## Data boundary

The first remote prototype has no application-level authentication. Use it only with non-confidential test facts until an authenticated deployment is configured. Do not send restricted corporate documents, confidential design data, contract data, personal data, or secrets through the public endpoint.

