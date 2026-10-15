import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { BookLeafAIService, TicketCategory } from '@/lib/ai';

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
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        author: {
          include: {
            authorProfile: true,
          },
        },
        book: true,
        messages: {
          where: { isInternalNote: false },
          orderBy: { createdAt: 'asc' },
          select: { senderRole: true, message: true, createdAt: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const draft = await BookLeafAIService.draftResponse({
      authorName: ticket.author.name,
      category: ticket.category as TicketCategory,
      subject: ticket.subject,
      description: ticket.description,
      book: ticket.book
        ? {
            title: ticket.book.title,
            isbn: ticket.book.isbn,
            status: ticket.book.status,
            productionStage: ticket.book.productionStage,
            mrp: ticket.book.mrp,
            copiesSold: ticket.book.copiesSold,
            totalRoyaltyEarned: ticket.book.totalRoyaltyEarned,
            royaltyPaid: ticket.book.royaltyPaid,
            royaltyPending: ticket.book.royaltyPending,
          }
        : null,
      authorProfile: ticket.author.authorProfile
        ? {
            bankAccountLinked: ticket.author.authorProfile.bankAccountLinked,
            bankName: ticket.author.authorProfile.bankName,
            country: ticket.author.authorProfile.country,
          }
        : null,
      conversationHistory: ticket.messages,
    });

    // Update ticket with generated draft
    await db.ticket.update({
      where: { id: ticket.id },
      data: {
        aiDraft: draft.draftText,
        aiDraftGeneratedAt: new Date(),
      },
    });

    await db.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        actorId: session.id,
        action: 'AI_DRAFT_GENERATED',
        details: JSON.stringify({
          source: draft.source,
          keyPointsCount: draft.keyPointsCovered.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      draft,
      message: 'Draft generated successfully based on BookLeaf Knowledge Base.',
    });
  } catch (err) {
    console.error('[API /api/admin/tickets/[ticketId]/ai/draft] Error:', err);
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 });
  }
}
