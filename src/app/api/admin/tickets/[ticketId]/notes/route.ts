import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

const NoteSchema = z.object({
  note: z.string().min(2, 'Note cannot be empty').max(3000, 'Note is too long'),
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
    const result = NoteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid note input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Create PRIVATE internal note (isInternalNote: true)
    const noteMessage = await db.ticketMessage.create({
      data: {
        ticketId,
        senderId: session.id,
        senderRole: 'ADMIN',
        message: result.data.note,
        isInternalNote: true, // PRIVATE TO ADMINS ONLY!
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Record internal activity
    await db.ticketActivity.create({
      data: {
        ticketId,
        actorId: session.id,
        action: 'NOTE_ADDED',
        details: JSON.stringify({ adminName: session.name }),
      },
    });

    // NOTE: Internal notes are NEVER broadcast via SSE to author!
    return NextResponse.json({
      success: true,
      note: noteMessage,
    });
  } catch (err) {
    console.error('[API /api/admin/tickets/[ticketId]/notes] Error:', err);
    return NextResponse.json({ error: 'Failed to add internal note' }, { status: 500 });
  }
}
