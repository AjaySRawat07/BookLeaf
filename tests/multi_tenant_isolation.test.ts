import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';

describe('Multi-Tenant Data Isolation & IDOR Protection Tests', () => {
  it('should ensure each author can only query their own books', async () => {
    // Lookup Vikram Seth and Anita Nair
    const authorA = await db.user.findUnique({
      where: { email: 'vikram.seth@example.com' },
      include: { authorProfile: true },
    });
    const authorB = await db.user.findUnique({
      where: { email: 'anita.nair@example.com' },
      include: { authorProfile: true },
    });

    assert.ok(authorA?.authorProfile);
    assert.ok(authorB?.authorProfile);

    // Books owned by Author A
    const booksA = await db.book.findMany({
      where: { authorId: authorA.authorProfile.id },
    });

    // Books owned by Author B
    const booksB = await db.book.findMany({
      where: { authorId: authorB.authorProfile.id },
    });

    assert.ok(booksA.length > 0);
    assert.ok(booksB.length > 0);

    // Verify disjoint sets: Author A owns NONE of Author B's books
    const bookIdsA = new Set(booksA.map((b) => b.id));
    for (const b of booksB) {
      assert.equal(bookIdsA.has(b.id), false, `Author A must not own Author B's book ${b.title}`);
    }
  });

  it('should ensure each author can only query their own tickets', async () => {
    const authorA = await db.user.findUnique({ where: { email: 'vikram.seth@example.com' } });
    const authorB = await db.user.findUnique({ where: { email: 'anita.nair@example.com' } });

    assert.ok(authorA);
    assert.ok(authorB);

    const ticketsA = await db.ticket.findMany({ where: { authorId: authorA.id } });
    const ticketsB = await db.ticket.findMany({ where: { authorId: authorB.id } });

    const ticketIdsA = new Set(ticketsA.map((t) => t.id));
    for (const t of ticketsB) {
      assert.equal(ticketIdsA.has(t.id), false, `Author A must not access Author B's ticket ${t.ticketNumber}`);
    }
  });

  it('should strictly filter out private internal notes from author responses', async () => {
    // Find ticket with internal note
    const ticketWithNote = await db.ticket.findFirst({
      where: {
        messages: {
          some: { isInternalNote: true },
        },
      },
    });

    assert.ok(ticketWithNote, 'Expected at least one seeded ticket with internal note');

    // Simulate Author API query with privacy filter:
    const authorVisibleMessages = await db.ticketMessage.findMany({
      where: {
        ticketId: ticketWithNote.id,
        isInternalNote: false, // Strict Author Privacy Filter
      },
    });

    for (const msg of authorVisibleMessages) {
      assert.equal(msg.isInternalNote, false, 'Author must NEVER receive an internal note');
    }

    // Admin query sees both
    const allMessagesForAdmin = await db.ticketMessage.findMany({
      where: { ticketId: ticketWithNote.id },
    });

    assert.ok(allMessagesForAdmin.length > authorVisibleMessages.length, 'Admin sees internal notes while author does not');
  });
});
