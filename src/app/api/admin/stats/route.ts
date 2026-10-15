import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      urgentUnresolvedTickets,
      ticketsByCategory,
      ticketsByPriority,
      recentActivity,
    ] = await Promise.all([
      db.ticket.count(),
      db.ticket.count({ where: { status: 'OPEN' } }),
      db.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      db.ticket.count({ where: { status: 'RESOLVED' } }),
      db.ticket.count({ where: { status: 'CLOSED' } }),
      db.ticket.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          priority: { in: ['Critical', 'High'] },
        },
      }),
      db.ticket.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      db.ticket.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),
      db.ticketActivity.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ticket: { select: { id: true, ticketNumber: true, subject: true } },
          actor: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    // Format category distribution
    const categoryCounts: Record<string, number> = {};
    for (const item of ticketsByCategory) {
      categoryCounts[item.category] = item._count.id;
    }

    // Format priority distribution
    const priorityCounts: Record<string, number> = {};
    for (const item of ticketsByPriority) {
      priorityCounts[item.priority] = item._count.id;
    }

    return NextResponse.json({
      metrics: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        urgentUnresolvedTickets,
        awaitingResponse: openTickets,
      },
      categoryDistribution: categoryCounts,
      priorityDistribution: priorityCounts,
      recentActivity,
    });
  } catch (err) {
    console.error('[API /api/admin/stats] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch operational stats' }, { status: 500 });
  }
}
