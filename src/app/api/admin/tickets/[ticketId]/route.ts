import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { broadcastTicketUpdate } from '@/lib/events';
import { VALID_CATEGORIES, VALID_PRIORITIES } from '@/lib/ai/types';

const UpdateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  priority: z.enum(VALID_PRIORITIES).optional(),
  assignedAdminId: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticketId } = await params;

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        author: {
          include: {
            authorProfile: true,
          },
        },
        book: true,
        assignedAdmin: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, role: true, email: true },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Format book platforms if present
    const formattedBook = ticket.book
      ? {
          ...ticket.book,
          platforms: ticket.book.platforms ? JSON.parse(ticket.book.platforms) : [],
        }
      : null;

    return NextResponse.json({
      ticket: {
        ...ticket,
        book: formattedBook,
      },
    });
  } catch (err) {
    console.error('[API /api/admin/tickets/[ticketId] GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    const result = UpdateTicketSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid update input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const currentTicket = await db.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    const activitiesToCreate: { action: string; details: string }[] = [];

    // Status change
    if (result.data.status && result.data.status !== currentTicket.status) {
      updateData.status = result.data.status;
      activitiesToCreate.push({
        action: 'STATUS_CHANGED',
        details: JSON.stringify({ from: currentTicket.status, to: result.data.status }),
      });
    }

    // Category override
    if (result.data.category && result.data.category !== currentTicket.category) {
      updateData.category = result.data.category;
      updateData.categoryOverridden = true;
      activitiesToCreate.push({
        action: 'CATEGORY_OVERRIDDEN',
        details: JSON.stringify({
          from: currentTicket.category,
          to: result.data.category,
          overriddenBy: session.name,
        }),
      });
    }

    // Priority override
    if (result.data.priority && result.data.priority !== currentTicket.priority) {
      updateData.priority = result.data.priority;
      updateData.priorityOverridden = true;
      activitiesToCreate.push({
        action: 'PRIORITY_OVERRIDDEN',
        details: JSON.stringify({
          from: currentTicket.priority,
          to: result.data.priority,
          overriddenBy: session.name,
        }),
      });
    }

    // Admin assignment
    if (result.data.assignedAdminId !== undefined && result.data.assignedAdminId !== currentTicket.assignedAdminId) {
      updateData.assignedAdminId = result.data.assignedAdminId;
      activitiesToCreate.push({
        action: 'ASSIGNED',
        details: JSON.stringify({ assignedTo: result.data.assignedAdminId }),
      });
    }

    // Update ticket in database
    const updatedTicket = await db.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        assignedAdmin: { select: { id: true, name: true, email: true } },
      },
    });

    // Record activity items
    for (const act of activitiesToCreate) {
      await db.ticketActivity.create({
        data: {
          ticketId,
          actorId: session.id,
          action: act.action,
          details: act.details,
        },
      });
    }

    // Broadcast SSE update if status or priority changed
    if (updateData.status) {
      broadcastTicketUpdate(ticketId, 'status_change', { status: updateData.status });
    }
    if (updateData.priority) {
      broadcastTicketUpdate(ticketId, 'priority_change', { priority: updateData.priority });
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error('[API /api/admin/tickets/[ticketId] PATCH] Error:', err);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}
