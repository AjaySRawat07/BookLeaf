import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;

    const book = await db.book.findUnique({
      where: { id: bookId },
      include: {
        author: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        tickets: {
          where: { authorId: session.id },
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // IDOR verification: Ensure author owns this book (unless user is ADMIN)
    if (session.role !== 'ADMIN' && book.author.userId !== session.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access this book.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      book: {
        ...book,
        platforms: book.platforms ? JSON.parse(book.platforms) : [],
      },
    });
  } catch (err) {
    console.error('[API /api/author/books/[bookId]] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
