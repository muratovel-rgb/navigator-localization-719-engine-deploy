# Deployment checklist

1. Push all files in this directory to the repository root.
2. Render runtime: Node.
3. Build command: `npm ci || npm install`.
4. Start command: `npm start`.
5. Health endpoint: `/health`.
6. MCP endpoint: `/mcp`.
7. First deployment must be tested only with non-confidential facts because v0.2.2 has no application-level authentication.

