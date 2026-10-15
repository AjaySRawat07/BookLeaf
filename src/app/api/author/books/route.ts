import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lookup author profile
    const authorProfile = await db.authorProfile.findUnique({
      where: { userId: session.id },
    });

    if (!authorProfile && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Author profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'copiesSold';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Authors see ONLY their own books.
    const authorProfileId = authorProfile?.id;
    if (!authorProfileId) {
      return NextResponse.json({ books: [], summary: { totalBooks: 0, copiesSold: 0, totalRoyaltyEarned: 0, royaltyPaid: 0, royaltyPending: 0 } });
    }

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      authorId: authorProfileId,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search.trim()) {
      where.OR = [
        { title: { contains: search } },
        { isbn: { contains: search } },
        { genre: { contains: search } },
      ];
    }

    // Query books
    const books = await db.book.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
    });

    // Parse platforms JSON
    const parsedBooks = books.map((b) => ({
      ...b,
      platforms: b.platforms ? JSON.parse(b.platforms) : [],
    }));

    // Calculate aggregated royalty metrics
    const allAuthorBooks = await db.book.findMany({
      where: { authorId: authorProfileId },
    });

    const summary = allAuthorBooks.reduce(
      (acc, b) => ({
        totalBooks: acc.totalBooks + 1,
        publishedBooks: acc.publishedBooks + (b.status === 'PUBLISHED' ? 1 : 0),
        inProductionBooks: acc.inProductionBooks + (b.status === 'IN_PRODUCTION' ? 1 : 0),
        copiesSold: acc.copiesSold + b.copiesSold,
        totalRoyaltyEarned: acc.totalRoyaltyEarned + b.totalRoyaltyEarned,
        royaltyPaid: acc.royaltyPaid + b.royaltyPaid,
        royaltyPending: acc.royaltyPending + b.royaltyPending,
      }),
      {
        totalBooks: 0,
        publishedBooks: 0,
        inProductionBooks: 0,
        copiesSold: 0,
        totalRoyaltyEarned: 0,
        royaltyPaid: 0,
        royaltyPending: 0,
      }
    );

    return NextResponse.json({
      books: parsedBooks,
      summary,
    });
  } catch (err) {
    console.error('[API /api/author/books] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch author books' }, { status: 500 });
  }
}
