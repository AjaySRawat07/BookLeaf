import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { broadcastTicketUpdate } from '@/lib/events';

const ReplySchema = z.object({
  message: z.string().min(2, 'Message cannot be empty').max(3000, 'Message is too long'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await params;

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            isbn: true,
            status: true,
            productionStage: true,
            mrp: true,
            copiesSold: true,
            totalRoyaltyEarned: true,
            royaltyPaid: true,
            royaltyPending: true,
          },
        },
        messages: {
          where: { isInternalNote: false }, // STRICT PRIVACY: NEVER leak internal notes to authors!
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // IDOR Protection: Author can ONLY access their own ticket!
    if (session.role !== 'ADMIN' && ticket.authorId !== session.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view this ticket.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ ticket });
  } catch (err) {
    console.error('[API /api/author/tickets/[ticketId] GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const session = await getSession();
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

    // Author ownership check
    if (session.role !== 'ADMIN' && ticket.authorId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (ticket.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'This ticket is closed and cannot receive further replies.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = ReplySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Create public author message
    const message = await db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: session.id,
        senderRole: 'AUTHOR',
        message: result.data.message,
        isInternalNote: false,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // If ticket was resolved, reopen it to IN_PROGRESS
    const newStatus = ticket.status === 'RESOLVED' ? 'IN_PROGRESS' : ticket.status;
    await db.ticket.update({
      where: { id: ticket.id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    await db.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        actorId: session.id,
        action: 'PUBLIC_REPLY',
        details: JSON.stringify({ role: 'AUTHOR' }),
      },
    });

    // Broadcast real-time SSE event
    broadcastTicketUpdate(ticket.id, 'message', message);

    return NextResponse.json({ success: true, message });
  } catch (err) {
    console.error('[API /api/author/tickets/[ticketId] POST] Error:', err);
    return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 });
  }
}
