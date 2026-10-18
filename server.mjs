import express from 'express';
import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod/v3';

const require = createRequire(import.meta.url);
const A = require('./adapter.js');

const toolResult = (output) => ({
  content: [{ type: 'text', text: JSON.stringify(output) }],
  structuredContent: output
});

function createMcpServer() {
  const server = new McpServer({
    name: 'navigator-localization-719-engine',
    version: '0.4.2'
  });

  server.registerTool(
    'engine_health',
    {
      title: 'Navigator 719 Engine Health',
      description: 'Return deterministic engine version and available calculation rule IDs. Use to verify which HTML 0.8 calculation branches are actually available.'
    },
    async () => toolResult(A.health())
  );

  server.registerTool(
    'search_localization_rules',
    {
      title: 'Search PP 719 Calculation Rules',
      description: 'Search all 787 indexed PP 719 positions plus prepared calculation branches. Return source, coverage and calculation availability. Use get_localization_rule for exact indexed text; not every index position is a verified calculation rule.',
      inputSchema: {
        query: z.string().min(1).describe('OKPD2, product name, rule name, registry number, or identifier'),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional()
      }
    },
    async (args) => toolResult(A.searchRules(args))
  );

  server.registerTool(
    'get_localization_rule',
    {
      title: 'Get PP 719 Calculation Rule',
      description: 'Return the exact prepared calculation rule from Navigator HTML 0.8, including mandatory conditions, operations, points, source, evidence expectations, and exclusions.',
      inputSchema: {
        ruleId: z.string().min(1).describe('Rule ID returned by search_localization_rules')
      }
    },
    async ({ ruleId }) => toolResult(A.getRule({ ruleId }))
  );

  server.registerTool(
    'get_threshold_context',
    {
      title: 'Get PP 719 Threshold Context',
      description: 'Deterministically determine whether a numeric threshold exists for the selected rule, date and purpose. It deliberately does not extend 2023-2025 procurement thresholds into 2026 and does not invent a universal registry/localization threshold.',
      inputSchema: {
        ruleId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        goal: z.enum(['localization','registry','support','procurement']).default('localization'),
        applicableCriterionIds: z.array(z.string()).optional().describe('Optional applicable scored criterion IDs when technology excludes operations on a documented basis')
      }
    },
    async (args) => toolResult(A.thresholdContext(args))
  );

  server.registerTool(
    'calculate_localization',
    {
      title: 'Calculate Localization with Navigator 0.8 Engine',
      description: 'Run the deterministic Navigator HTML 0.8 calculation engine for a prepared rule branch. The tool keeps mandatory conditions separate from points and returns unknown/blocked when rule selection, applicability, or facts are insufficient. It does not create official Russian-origin status.',
      inputSchema: {
        ruleId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        goal: z.enum(['localization','registry','support','procurement']).default('localization'),
        classificationConfirmed: z.boolean().default(false).describe('True only after the product is confirmed to match the selected PP 719 position'),
        name: z.string().optional(),
        characteristics: z.string().optional(),
        selection: z.object({
          equipment: z.string().max(120).optional(),
          type: z.string().max(120).optional(),
          usage: z.string().max(120).optional(),
          standard: z.string().max(120).optional()
        }).strict().optional().describe('Existing assessment selection fields. Values and applicability are validated only by the shared engine; missing context remains blocked.'),
        facts: z.record(z.record(z.any())).optional().describe('Facts keyed by criterion ID. Use get_localization_rule first.'),
        costs: z.record(z.any()).optional().describe('Cost inputs for rules that use foreign-component share')
      }
    },
    async (args) => toolResult(A.calculateLocalization(args))
  );

  return server;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ...A.health(), serviceVersion: '0.4.2' }));

app.post('/mcp', async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  try {
    res.on('close', () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null
      });
    }
  }
});

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

const port = Number.parseInt(process.env.PORT || '3000', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`Navigator 719 MCP v0.4.2 listening on :${port}/mcp`);
});

