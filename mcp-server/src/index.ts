import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create MCP server
const server = new McpServer({
  name: 'hydra-payment-gateway',
  version: '1.0.0'
});

// Helper function to create a tool response
function createToolResponse(data: any) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Helper function to create an error response
function createErrorResponse(message: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: message,
      },
    ],
    isError: true,
  };
}

// ====================
// Payment Intent Tools
// ====================

// Create Payment Intent
const createPaymentIntentSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3).uppercase(),
  description: z.string().optional(),
  paymentMethod: z.string().optional(),
});

server.registerTool('create_payment_intent', {
  description: 'Create a payment intent with Hydra Payment Gateway',
  inputSchema: createPaymentIntentSchema,
}, async (args, extra) => {
  // Just return a mock response for now
  return createToolResponse({ 
    id: 'pi_test_123',
    amount: args.amount,
    currency: args.currency,
    status: 'requires_payment_method'
  });
});

// Health Check Tool
server.registerTool('health_check', {
  description: 'Check the health of the Hydra Payment Gateway MCP server',
  inputSchema: z.object({}), // Empty object schema
}, async (_args, _extra) => {
  return createToolResponse({ status: 'ok', timestamp: Date.now(), version: '1.0.0' });
});

// ====================
// Start Server
// ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Hydra Payment Gateway MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
