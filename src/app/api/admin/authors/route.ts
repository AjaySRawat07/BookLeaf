import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { role: 'AUTHOR' };
    if (search.trim()) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { authorProfile: { penName: { contains: search } } },
      ];
    }

    const authors = await db.user.findMany({
      where,
      include: {
        authorProfile: {
          include: {
            books: {
              select: {
                id: true,
                title: true,
                status: true,
                copiesSold: true,
                totalRoyaltyEarned: true,
                royaltyPaid: true,
                royaltyPending: true,
              },
            },
          },
        },
        _count: {
          select: {
            tickets: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = authors.map((a) => {
      const books = a.authorProfile?.books || [];
      const totalRoyaltyEarned = books.reduce((sum, b) => sum + b.totalRoyaltyEarned, 0);
      const royaltyPaid = books.reduce((sum, b) => sum + b.royaltyPaid, 0);
      const royaltyPending = books.reduce((sum, b) => sum + b.royaltyPending, 0);
      const copiesSold = books.reduce((sum, b) => sum + b.copiesSold, 0);

      return {
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        profile: a.authorProfile,
        bookCount: books.length,
        copiesSold,
        totalRoyaltyEarned,
        royaltyPaid,
        royaltyPending,
        openTicketCount: a._count.tickets,
      };
    });

    return NextResponse.json({ authors: formatted });
  } catch (err) {
    console.error('[API /api/admin/authors] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch authors' }, { status: 500 });
  }
}
