import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { BookLeafAIService } from '@/lib/ai';
import { rateLimit } from '@/lib/auth/rateLimit';

const CreateTicketSchema = z.object({
  bookId: z.string().nullable().optional(),
  queryType: z.enum(['BOOK_SPECIFIC', 'GENERAL_ACCOUNT']).default('GENERAL_ACCOUNT'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(150, 'Subject is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(3000, 'Description exceeds 3000 characters limit'),
  attachmentUrl: z.string().url().nullable().optional().or(z.literal('')),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Author sees ONLY their own tickets
    const tickets = await db.ticket.findMany({
      where: { authorId: session.id },
      include: {
        book: {
          select: { id: true, title: true, isbn: true, status: true },
        },
        messages: {
          where: { isInternalNote: false }, // STRICT PRIVACY: NEVER leak internal notes
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, senderRole: true, createdAt: true, message: true },
        },
        _count: {
          select: {
            messages: { where: { isInternalNote: false } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tickets });
  } catch (err) {
    console.error('[API /api/author/tickets GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 10 ticket submissions per minute per user
    const limit = rateLimit(`ticket_create:${session.id}`, 10, 60000);
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Ticket submission rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = CreateTicketSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { bookId, queryType, subject, description, attachmentUrl } = result.data;

    // Validate book ownership if bookId is provided
    let book = null;
    if (bookId) {
      book = await db.book.findUnique({
        where: { id: bookId },
        include: { author: true },
      });

      if (!book || (session.role !== 'ADMIN' && book.author.userId !== session.id)) {
        return NextResponse.json(
          { error: 'Invalid book selected or book does not belong to your account.' },
          { status: 400 }
        );
      }
    }

    // Generate readable ticket number (e.g. BL-8405)
    const count = await db.ticket.count();
    const ticketNumber = `BL-${8400 + count + 1}`;

    // STEP 1: Persist the ticket FIRST so AI issues NEVER prevent ticket creation!
    const ticket = await db.ticket.create({
      data: {
        ticketNumber,
        authorId: session.id,
        bookId: book ? book.id : null,
        queryType: book ? 'BOOK_SPECIFIC' : queryType,
        subject,
        description,
        attachmentUrl: attachmentUrl || null,
        status: 'OPEN',
        category: 'General Inquiry', // Safe initial fallback
        priority: 'Medium',          // Safe initial fallback
      },
    });

    // STEP 2: Persist the initial Author message
    await db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: session.id,
        senderRole: 'AUTHOR',
        message: description,
        isInternalNote: false,
      },
    });

    // STEP 3: Record Creation Activity
    await db.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        actorId: session.id,
        action: 'CREATED',
        details: JSON.stringify({ subject, bookTitle: book?.title || 'General Account' }),
      },
    });

    // STEP 4: Run AI Classification & Priority Scoring (Safe try/catch)
    try {
      const classification = await BookLeafAIService.classifyTicket(
        subject,
        description,
        book?.title
      );

      const priorityScore = await BookLeafAIService.scorePriority(
        classification.category,
        subject,
        description,
        book ? { title: book.title, status: book.status, productionStage: book.productionStage } : null
      );

      // Update ticket with AI results
      await db.ticket.update({
        where: { id: ticket.id },
        data: {
          category: classification.category,
          aiCategory: classification.category,
          priority: priorityScore.priority,
          aiPriority: priorityScore.priority,
          aiConfidence: classification.confidence,
          aiRationale: classification.rationale,
        },
      });

      await db.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          action: 'AI_CLASSIFIED',
          details: JSON.stringify({
            category: classification.category,
            priority: priorityScore.priority,
            source: classification.source,
          }),
        },
      });
    } catch (aiErr) {
      console.warn('[Ticket Creation] Async AI enrichment encountered error (non-fatal):', aiErr);
    }

    // Fetch the updated ticket
    const finalTicket = await db.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        book: { select: { id: true, title: true, isbn: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        ticket: finalTicket,
        message: 'Your query has been submitted successfully. Our team will review it shortly.',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[API /api/author/tickets POST] Error:', err);
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 });
  }
}
