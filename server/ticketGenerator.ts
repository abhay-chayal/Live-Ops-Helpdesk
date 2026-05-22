import type { Ticket, Priority, TicketStatus } from '../types';

// ── Lock TTL ─────────────────────────────────────────────────
export const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Initial ticket seed data ─────────────────────────────────

const customers = [
  'Apex Logistics', 'BlueSky Freight', 'Cascade Retail', 'Delta Shipping',
  'Echo Commerce', 'Frontier Supply', 'Global Trade Co', 'Harbor Goods',
  'Indigo Direct', 'JetStream Cargo', 'Keystone Dist', 'Luminary Brands',
];

const issues = [
  'Order #8821 delayed — customer escalating to management',
  'Payment gateway timeout on checkout (500 error)',
  'Shipment tracking shows "stuck in transit" for 4 days',
  'API rate limit exceeded — integration partner blocked',
  'Warehouse pick error: wrong SKU shipped to enterprise client',
  'SLA breach risk: ticket open 47h without resolution',
  'Customer refund not processed after 72-hour window',
  'Bulk import failing — CSV validation errors on 3,000 rows',
  'Live chat widget offline during peak hours (bug report)',
  'Carrier invoice discrepancy: $4,200 over-charge disputed',
  'Account locked after suspicious login — executive account',
  'Webhook delivery failures exceeding 30% error rate',
];

const categories = [
  'Logistics', 'Billing', 'Technical', 'Integration',
  'Warehouse', 'SLA', 'Financial', 'Data', 'System', 'Security',
];

const agents = [
  'Agent Alex', 'Agent Sam', 'Agent Jordan', 'Agent Riley',
  'Agent Morgan', 'Agent Casey', null,
];

const priorities: Priority[] = ['critical', 'high', 'medium', 'low'];
const statuses: TicketStatus[] = ['open', 'in_progress', 'pending'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let ticketCounter = 1000;

export function generateTicket(): Ticket {
  const id = `TKT-${++ticketCounter}`;
  const now = new Date().toISOString();
  return {
    id,
    customerName: pick(customers),
    issue: pick(issues),
    priority: pick(priorities),
    status: pick(statuses),
    assignedAgent: pick(agents),
    lockedBy: null,
    category: pick(categories),
    createdAt: now,
    updatedAt: now,
  };
}

export function generateInitialTickets(count = 12): Ticket[] {
  const tickets: Ticket[] = [];
  for (let i = 0; i < count; i++) {
    const ticket = generateTicket();
    // Backdate some for realism
    const minutesAgo = Math.floor(Math.random() * 180);
    const past = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
    ticket.createdAt = past;
    ticket.updatedAt = past;
    tickets.push(ticket);
  }
  return tickets;
}
