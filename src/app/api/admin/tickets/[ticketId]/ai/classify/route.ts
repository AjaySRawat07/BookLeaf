import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { BookLeafAIService } from '@/lib/ai';

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
      include: { book: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Run AI classification
    const classification = await BookLeafAIService.classifyTicket(
      ticket.subject,
      ticket.description,
      ticket.book?.title
    );

    // Also score priority
    const priorityScore = await BookLeafAIService.scorePriority(
      classification.category,
      ticket.subject,
      ticket.description,
      ticket.book ? { title: ticket.book.title, status: ticket.book.status, productionStage: ticket.book.productionStage } : null
    );

    // CRITICAL: Preserve human override if the admin manually set the category or priority!
    const updateData: {
      aiCategory: string;
      aiPriority: string;
      aiConfidence: number;
      aiRationale: string;
      category?: string;
      priority?: string;
    } = {
      aiCategory: classification.category,
      aiPriority: priorityScore.priority,
      aiConfidence: classification.confidence,
      aiRationale: classification.rationale,
    };

    if (!ticket.categoryOverridden) {
      updateData.category = classification.category;
    }

    if (!ticket.priorityOverridden) {
      updateData.priority = priorityScore.priority;
    }

    const updated = await db.ticket.update({
      where: { id: ticket.id },
      data: updateData,
    });

    await db.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        actorId: session.id,
        action: 'AI_CLASSIFIED',
        details: JSON.stringify({
          categorySuggested: classification.category,
          categoryApplied: updated.category,
          categoryOverridden: ticket.categoryOverridden,
          prioritySuggested: priorityScore.priority,
          priorityApplied: updated.priority,
          priorityOverridden: ticket.priorityOverridden,
          source: classification.source,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      classification,
      priority: priorityScore,
      ticket: updated,
      humanOverridePreserved: ticket.categoryOverridden || ticket.priorityOverridden,
    });
  } catch (err) {
    console.error('[API /api/admin/tickets/[ticketId]/ai/classify] Error:', err);
    return NextResponse.json({ error: 'Failed to run AI classification' }, { status: 500 });
  }
}
