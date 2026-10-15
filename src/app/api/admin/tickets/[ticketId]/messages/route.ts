import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { broadcastTicketUpdate } from '@/lib/events';

const AdminReplySchema = z.object({
  message: z.string().min(2, 'Response message is required').max(5000, 'Message is too long'),
  updateStatus: z.enum(['IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticketId } = await params;
    const body = await request.json();
    const result = AdminReplySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid message', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Create PUBLIC admin response
    const message = await db.ticketMessage.create({
      data: {
        ticketId,
        senderId: session.id,
        senderRole: 'ADMIN',
        message: result.data.message,
        isInternalNote: false, // PUBLIC!
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // Update ticket status if provided or default to IN_PROGRESS
    const newStatus = result.data.updateStatus || (ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status);
    await db.ticket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        assignedAdminId: ticket.assignedAdminId || session.id,
        updatedAt: new Date(),
      },
    });

    // Record activity
    await db.ticketActivity.create({
      data: {
        ticketId,
        actorId: session.id,
        action: 'PUBLIC_REPLY',
        details: JSON.stringify({ adminName: session.name, status: newStatus }),
      },
    });

    // Broadcast update via SSE to author in real time!
    broadcastTicketUpdate(ticketId, 'message', message);
    if (newStatus !== ticket.status) {
      broadcastTicketUpdate(ticketId, 'status_change', { status: newStatus });
    }

    return NextResponse.json({
      success: true,
      message,
      newStatus,
    });
  } catch (err) {
    console.error('[API /api/admin/tickets/[ticketId]/messages] Error:', err);
    return NextResponse.json({ error: 'Failed to send response' }, { status: 500 });
  }
}
