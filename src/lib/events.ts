import { EventEmitter } from 'events';

// Global singleton event emitter for real-time ticket SSE streaming
class TicketEventEmitter extends EventEmitter {}

const globalForEvents = global as unknown as { ticketEvents: TicketEventEmitter };

export const ticketEvents = globalForEvents.ticketEvents || new TicketEventEmitter();

// Increase max listeners for concurrent SSE author connections
ticketEvents.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.ticketEvents = ticketEvents;
}

export type TicketEventType = 'message' | 'status_change' | 'priority_change' | 'assigned';

export interface TicketUpdatePayload {
  ticketId: string;
  type: TicketEventType;
  data: unknown;
  timestamp: string;
}

export function broadcastTicketUpdate(ticketId: string, type: TicketEventType, data: unknown) {
  const payload: TicketUpdatePayload = {
    ticketId,
    type,
    data,
    timestamp: new Date().toISOString(),
  };
  ticketEvents.emit(`ticket:${ticketId}`, payload);
}
