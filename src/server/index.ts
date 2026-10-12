import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { loadJson, saveJson, loadText } from './data.js';

type Partner = {
  id: string; name: string; tier: string; region: string;
  partner_manager: string; status: string; joined: string;
};
type Deal = {
  id: string; partner_id: string; customer: string;
  registered_on: string; status: string; expires_on: string;
};
type Cert = {
  partner_id: string; certified_people: number;
  required_for_tier: number; next_expiry: string;
};
type Ticket = Record<string, unknown> & { id: string; status: string };

const REQUEST_TYPES = ['partner_application', 'deal_registration', 'tier_question', 'certification',
  'technical_issue', 'co_marketing', 'escalation', 'unclear'] as const;
const ROUTES = ['partner_recruitment', 'deal_desk', 'partner_manager', 'enablement',
  'partner_support', 'partner_marketing', 'human_review'] as const;
function createServer(): McpServer {
  const server = new McpServer({ name: 'partner-ops', version: '0.1.0' });

  server.registerTool(
    'get_partner',
    {
      description:
        'Look up a partner company by name. Use this first for any request that mentions a partner. ' +
        'Returns tier, region, partner manager and status. Suggests close matches if the name is not exact.',
      inputSchema: z.object({
        name: z.string().describe('Partner company name, e.g. Northwind Consulting')
      })
    },
    async ({ name }) => {
      const partners = await loadJson<Partner[]>('data/partners.json');
      const wanted = name.trim().toLowerCase();
      const match = partners.find(p => p.name.toLowerCase() === wanted);
      if (match) {
        return { content: [{ type: 'text', text: JSON.stringify(match) }] };
      }
      const close = partners
        .filter(p => wanted.length >= 4 && p.name.toLowerCase().startsWith(wanted.slice(0, 4)))
        .map(p => p.name);
      const text = close.length
        ? `No exact match for "${name}". Did you mean: ${close.join(', ')}?`
        : `No partner named "${name}". It may be a new company or a typo.`;
      return { content: [{ type: 'text', text }], isError: true };
    }
  );
  
  server.registerTool(
  'search_deal_registrations',
  {
    description:
      'Find deal registrations for a customer company. Use for any request about registering or protecting a deal. ' +
      'Flags a conflict when more than one partner has an active (approved or pending) registration for the same customer.',
    inputSchema: z.object({
      customer: z.string().describe('Customer company name, e.g. Acme Corp')
    })
  },
  async ({ customer }) => {
    const deals = await loadJson<Deal[]>('data/deals.json');
    const wanted = customer.trim().toLowerCase();
    const found = deals.filter(d => d.customer.toLowerCase() === wanted);
    const active = found.filter(d => d.status === 'approved' || d.status === 'pending');
    const conflict = new Set(active.map(d => d.partner_id)).size > 1;
    const result = { customer, registrations: found, active_count: active.length, conflict };
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.registerTool(
  'get_certification_status',
  {
    description:
      "Check a partner's certified headcount against what its tier requires, and when the next certification expires. " +
      'Use for certification, training and tier questions. Needs the partner ID from get_partner.',
    inputSchema: z.object({ partner_id: z.string().describe('Partner ID, e.g. P001') })
  },
  async ({ partner_id }) => {
    const certs = await loadJson<Cert[]>('data/certifications.json');
    const c = certs.find(x => x.partner_id === partner_id);
    if (!c) {
      return { content: [{ type: 'text', text: `No certification record for ${partner_id}.` }], isError: true };
    }
    const days = Math.round((Date.parse(c.next_expiry) - Date.now()) / 86_400_000);
    const result = { ...c, meets_requirement: c.certified_people >= c.required_for_tier, days_to_next_expiry: days };
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.registerTool(
  'get_routing_rules',
  {
    description:
      'Get the routing rules: which team handles each request type, the priority rules and the tricky cases. ' +
      'Use before every triage decision.',
    inputSchema: z.object({})
  },
  async () => ({ content: [{ type: 'text', text: await loadText('docs/routing-rules.md') }] })
);

server.registerTool(
  'create_triage_ticket',
  {
    description:
      'File the final triage decision for one partner request. Call this exactly once per request, after gathering facts. ' +
      'The ticket waits for human approval. Nothing is sent to the partner.',
    inputSchema: z.object({
      request_id: z.string().describe('The request ID from the email header, e.g. S01'),
      partner_id: z.string().optional().describe('Partner ID, if the partner was found'),
      request_type: z.enum(REQUEST_TYPES),
      route_to: z.enum(ROUTES),
      priority: z.enum(['urgent', 'high', 'normal']),
      confidence: z.enum(['high', 'medium', 'low']),
      summary: z.string().describe('One sentence a teammate can act on'),
      draft_reply: z.string().describe('Friendly, specific reply to the partner. Never name other partners or promise approvals.')
    })
  },
  async (decision) => {
    const tickets = await loadJson<Ticket[]>('data/tickets.json');
    const id = `T${String(tickets.length + 1).padStart(3, '0')}`;
    tickets.push({ id, created_at: new Date().toISOString(), ...decision, status: 'pending_approval' });
    await saveJson('data/tickets.json', tickets);
    return { content: [{ type: 'text', text: `Created ticket ${id}. It is waiting for human approval.` }] };
  }
);

server.registerTool(
  'list_pending_tickets',
  {
    description: 'List tickets waiting for human approval, oldest first.',
    inputSchema: z.object({})
  },
  async () => {
    const tickets = await loadJson<Ticket[]>('data/tickets.json');
    const pending = tickets.filter(t => t.status === 'pending_approval');
    return { content: [{ type: 'text', text: JSON.stringify(pending) }] };
  }
);

  // Add new tools here, above this line.
  return server;
}

void serveStdio(createServer);
console.error('partner-ops MCP server running on stdio');