import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ClassificationResultSchema,
  PriorityResultSchema,
  DraftResponseSchema,
  VALID_CATEGORIES,
  VALID_PRIORITIES,
} from '../src/lib/ai/types';
import {
  heuristicClassify,
  heuristicScorePriority,
  heuristicDraftResponse,
} from '../src/lib/ai/heuristics';
import { getRelevantKnowledge } from '../src/lib/ai/knowledgeBase';

describe('AI Integration & Knowledge Base Quality Tests', () => {
  it('should validate structured schemas for all 6 official categories', () => {
    for (const cat of VALID_CATEGORIES) {
      const validObj = {
        category: cat,
        confidence: 0.95,
        rationale: 'Valid test rationale for BookLeaf operations.',
        suggestedPriority: 'Medium',
      };
      const result = ClassificationResultSchema.safeParse(validObj);
      assert.equal(result.success, true);
    }

    // Invalid category should be rejected
    const invalidObj = {
      category: 'Fake Incompatible Category',
      confidence: 0.9,
      rationale: 'Should fail',
    };
    const invalidResult = ClassificationResultSchema.safeParse(invalidObj);
    assert.equal(invalidResult.success, false);
  });

  it('should validate structured schemas for all 4 official priorities', () => {
    for (const pri of VALID_PRIORITIES) {
      const validObj = {
        priority: pri,
        confidence: 0.92,
        rationale: 'Valid operational priority rationale.',
        escalationRecommended: pri === 'Critical',
      };
      const result = PriorityResultSchema.safeParse(validObj);
      assert.equal(result.success, true);
    }
  });

  it('should accurately classify all 7 sample queries from the BookLeaf assignment', () => {
    const testCases = [
      {
        subject: 'Royalty payout not received',
        description: "I published my book 4 months ago and still haven't received any royalty. What's going on?",
        expectedCategory: 'Royalty & Payments',
      },
      {
        subject: 'Royalty amount clarification',
        description: 'My royalty amount seems too low. I sold 200 copies but only received ₹3,000.',
        expectedCategory: 'Royalty & Payments',
      },
      {
        subject: 'Wrong ISBN on Amazon listing',
        description: "My book is showing a different ISBN on Amazon than what's on the physical copy.",
        expectedCategory: 'ISBN & Metadata Issues',
        expectedPriority: 'Critical',
      },
      {
        subject: 'Poor print quality in author copies',
        description: 'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.',
        expectedCategory: 'Printing & Quality',
      },
      {
        subject: 'Book out of stock on Amazon',
        description: "My book is published but it's showing as 'Currently Unavailable' on Amazon.",
        expectedCategory: 'Distribution & Availability',
      },
      {
        subject: 'Typesetting delay inquiry',
        description: "It's been 3 weeks and my book is still in typesetting. When will it be done?",
        expectedCategory: 'Book Status & Production Updates',
      },
      {
        subject: 'Amazon description update request',
        description: "Can I update the description of my book on Amazon after it's already live?",
        expectedCategory: 'General Inquiry',
      },
    ];

    for (const tc of testCases) {
      const res = heuristicClassify(tc.subject, tc.description);
      assert.equal(res.category, tc.expectedCategory, `Failed on query: "${tc.description}"`);

      if (tc.expectedPriority) {
        const priRes = heuristicScorePriority(res.category, tc.subject, tc.description);
        assert.equal(priRes.priority, tc.expectedPriority);
      }
    }
  });

  it('should generate draft response grounded in BookLeaf Knowledge Base with proper tone', () => {
    const draft = heuristicDraftResponse({
      authorName: 'Vikram Seth',
      bookTitle: 'A Monsoon Twilight',
      category: 'Royalty & Payments',
      subject: 'Royalty calculation question',
      description: 'My royalty amount seems too low. I sold 200 copies but only received ₹3,000.',
      royaltyPending: 3000,
      bankAccountLinked: true,
    });

    const parsed = DraftResponseSchema.parse(draft);
    assert.ok(parsed.draftText.includes('Dear Vikram Seth'));
    assert.ok(parsed.draftText.includes('80/20'));
    assert.ok(parsed.draftText.includes('Net Profit = MRP - (Printing Cost + Retail Platform Commission'));
    assert.ok(parsed.draftText.includes('Warm regards'));
  });

  it('should retrieve relevant knowledge base sections selectively for token cost efficiency', () => {
    // Royalty query should include company and royalties sections, but not printing or isbn
    const royaltyKB = getRelevantKnowledge('Royalty & Payments', 'When will my royalty be paid?');
    assert.ok(royaltyKB.includes('Royalty Policy'));
    assert.ok(royaltyKB.includes('80/20 royalty split'));

    // ISBN query should include ISBN section
    const isbnKB = getRelevantKnowledge('ISBN & Metadata Issues', 'My ISBN is different on Amazon');
    assert.ok(isbnKB.includes('ISBN Policy'));
    assert.ok(isbnKB.includes('48-hour'));
  });
});
