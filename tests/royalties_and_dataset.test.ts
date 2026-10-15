import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';

describe('Dataset Integrity, Edge Cases & BookLeaf Royalty Policy Tests', () => {
  it('should verify exactly 10 authors and 18 books are seeded in the database', async () => {
    const authorsCount = await db.user.count({ where: { role: 'AUTHOR' } });
    const booksCount = await db.book.count();

    assert.equal(authorsCount, 10, 'Expected exactly 10 seeded authors');
    assert.equal(booksCount, 18, 'Expected exactly 18 seeded books');
  });

  it('should verify exactly 2 books are in production stage with zero royalties', async () => {
    const inProdBooks = await db.book.findMany({
      where: { status: 'IN_PRODUCTION' },
    });

    assert.equal(inProdBooks.length, 2, 'Expected exactly 2 books in production');

    for (const b of inProdBooks) {
      assert.equal(b.copiesSold, 0);
      assert.equal(b.totalRoyaltyEarned, 0);
      assert.equal(b.royaltyPaid, 0);
      assert.equal(b.royaltyPending, 0);
      assert.ok(b.productionStage !== null, 'Production stage must be specified');
    }

    const titles = inProdBooks.map((b) => b.title);
    assert.ok(titles.includes('Echoes of the Ghats'));
    assert.ok(titles.includes('The Silicon Monks'));
  });

  it('should verify BookLeaf 80/20 net profit royalty calculation math', async () => {
    // Check "A Monsoon Twilight":
    // MRP: 499, Printing: 120, Commission: 75, Shipping: 45
    // Net profit per copy = 499 - 120 - 75 - 45 = 259
    // Author share (80%) = 0.8 * 259 = 207.20 per copy
    // For 200 copies = 200 * 207.20 = 41,440.00
    const book = await db.book.findUnique({
      where: { isbn: '978-93-94801-01-2' },
    });

    assert.ok(book);
    const netProfitPerCopy = book.mrp - (book.printingCost + book.platformCommission + book.shippingCharge);
    assert.equal(netProfitPerCopy, 259);

    const authorRoyaltyPerCopy = 0.8 * netProfitPerCopy;
    assert.equal(Math.round(authorRoyaltyPerCopy * 100) / 100, 207.20);

    const expectedTotal = authorRoyaltyPerCopy * book.copiesSold;
    assert.equal(Math.round(expectedTotal), 41440);
    assert.equal(book.totalRoyaltyEarned, 41440.00);
  });

  it('should handle zero-payout books and below ₹1,000 threshold rollovers gracefully', async () => {
    // Book with 0 copies sold and 0 earnings
    const zeroSalesBook = await db.book.findUnique({
      where: { isbn: '978-93-94801-16-6' }, // Threads of Surat
    });
    assert.ok(zeroSalesBook);
    assert.equal(zeroSalesBook.copiesSold, 0);
    assert.equal(zeroSalesBook.totalRoyaltyEarned, 0);
    assert.equal(zeroSalesBook.royaltyPaid, 0);
    assert.equal(zeroSalesBook.royaltyPending, 0);

    // Book with pending earnings under ₹1,000 threshold (Island of Whispering Trees: ₹844.80)
    const subThresholdBook = await db.book.findUnique({
      where: { isbn: '978-93-94801-15-9' },
    });
    assert.ok(subThresholdBook);
    assert.ok(subThresholdBook.royaltyPending > 0 && subThresholdBook.royaltyPending < 1000);
    assert.equal(subThresholdBook.royaltyPaid, 0); // Not paid yet because under ₹1,000 threshold
  });
});
