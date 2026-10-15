import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ticketEvents, TicketUpdatePayload } from '@/lib/events';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ticketId } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  // IDOR Protection: Author can only subscribe to their own ticket stream
  if (session.role !== 'ADMIN' && ticket.authorId !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const encoder = new TextEncoder();
  const eventName = `ticket:${ticketId}`;

  const customReadable = new ReadableStream({
    start(controller) {
      // Send initial connected confirmation
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ ticketId, connectedAt: new Date() })}\n\n`)
      );

      // Event listener for updates
      const listener = (payload: TicketUpdatePayload) => {
        try {
          controller.enqueue(
            encoder.encode(`event: update\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch (streamErr) {
          console.warn('[SSE] Error enqueuing update payload:', streamErr);
        }
      };

      ticketEvents.on(eventName, listener);

      // Periodic heartbeat every 20 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 20000);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        ticketEvents.off(eventName, listener);
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Encoding': 'none',
    },
  });
}
