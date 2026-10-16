# Security notes for v0.2.2 prototype

- The calculation service is stateless and does not intentionally persist submitted calculation facts.
- The initial Render deployment described by this package is unauthenticated unless an authentication layer is added separately.
- A private ChatGPT plugin does not make a public MCP endpoint private.
- Do not send confidential enterprise data to an unauthenticated endpoint.
- Do not embed tokens, passwords, API keys, or other secrets in `mcp.json` fixed headers.
- Before corporate rollout, add an authenticated MCP deployment and review host logging/retention, access controls, network controls, and data-processing requirements.

