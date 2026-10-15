import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ authorId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { authorId } = await params;

    const author = await db.user.findFirst({
      where: { id: authorId, role: 'AUTHOR' },
      include: {
        authorProfile: {
          include: {
            books: {
              orderBy: { copiesSold: 'desc' },
            },
          },
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            book: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    const books = author.authorProfile?.books || [];
    const formattedBooks = books.map((b) => ({
      ...b,
      platforms: b.platforms ? JSON.parse(b.platforms) : [],
    }));

    const totalEarned = books.reduce((sum, b) => sum + b.totalRoyaltyEarned, 0);
    const totalPaid = books.reduce((sum, b) => sum + b.royaltyPaid, 0);
    const totalPending = books.reduce((sum, b) => sum + b.royaltyPending, 0);
    const totalCopies = books.reduce((sum, b) => sum + b.copiesSold, 0);

    return NextResponse.json({
      author: {
        ...author,
        authorProfile: author.authorProfile
          ? { ...author.authorProfile, books: formattedBooks }
          : null,
      },
      summary: {
        bookCount: books.length,
        copiesSold: totalCopies,
        totalRoyaltyEarned: totalEarned,
        royaltyPaid: totalPaid,
        royaltyPending: totalPending,
        ticketCount: author.tickets.length,
      },
    });
  } catch (err) {
    console.error('[API /api/admin/authors/[authorId]] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
