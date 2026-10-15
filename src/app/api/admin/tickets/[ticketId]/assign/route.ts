import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

const AssignSchema = z.object({
  adminId: z.string().nullable().optional(), // If omitted or null, assigns to the calling admin
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
    const body = await request.json().catch(() => ({}));
    const parsed = AssignSchema.safeParse(body);

    const targetAdminId = parsed.success && parsed.data.adminId ? parsed.data.adminId : session.id;

    // Verify target admin exists
    const admin = await db.user.findFirst({
      where: { id: targetAdminId, role: 'ADMIN' },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    const updated = await db.ticket.update({
      where: { id: ticketId },
      data: {
        assignedAdminId: admin.id,
        updatedAt: new Date(),
      },
      include: {
        assignedAdmin: { select: { id: true, name: true, email: true } },
      },
    });

    await db.ticketActivity.create({
      data: {
        ticketId,
        actorId: session.id,
        action: 'ASSIGNED',
        details: JSON.stringify({ assignedTo: admin.name }),
      },
    });

    return NextResponse.json({
      success: true,
      ticket: updated,
      message: `Ticket successfully assigned to ${admin.name}.`,
    });
  } catch (err) {
    console.error('[API /api/admin/tickets/[ticketId]/assign] Error:', err);
    return NextResponse.json({ error: 'Failed to assign ticket' }, { status: 500 });
  }
}
