import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const priority = searchParams.get('priority') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20', 10)));
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (search.trim()) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { subject: { contains: search } },
        { description: { contains: search } },
        { author: { name: { contains: search } } },
        { author: { email: { contains: search } } },
        { book: { title: { contains: search } } },
      ];
    }

    const total = await db.ticket.count({ where });

    // Handle custom priority sorting if requested
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = { [sortBy]: sortOrder };
    if (sortBy === 'priority_custom') {
      // Default Prisma sort handles standard column sorts
      orderBy = [{ priority: 'asc' }, { createdAt: 'asc' }];
    }

    const tickets = await db.ticket.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        book: {
          select: { id: true, title: true, isbn: true, status: true },
        },
        assignedAdmin: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, senderRole: true, isInternalNote: true, createdAt: true },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Custom sort in memory for priority hierarchy if requested: Critical > High > Medium > Low
    let sortedTickets = tickets;
    if (sortBy === 'priority_urgency') {
      const priorityWeights: Record<string, number> = {
        Critical: 4,
        High: 3,
        Medium: 2,
        Low: 1,
      };
      sortedTickets = [...tickets].sort((a, b) => {
        const weightA = priorityWeights[a.priority] || 0;
        const weightB = priorityWeights[b.priority] || 0;
        if (weightA !== weightB) return weightB - weightA;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // oldest first for same priority
      });
    }

    return NextResponse.json({
      tickets: sortedTickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[API /api/admin/tickets GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}
