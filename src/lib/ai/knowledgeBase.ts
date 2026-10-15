/**
 * BookLeaf Official Knowledge Base (Version 1.0.0)
 * Authoritative operational policies, royalty rules, production workflows, and tone guidelines.
 */

export interface KnowledgeSection {
  id: string;
  title: string;
  keywords: string[];
  content: string;
}

export const BOOKLEAF_KNOWLEDGE_BASE: Record<string, KnowledgeSection> = {
  company: {
    id: 'company',
    title: 'Company Overview & Facilities',
    keywords: ['bookleaf', 'company', 'location', 'office', 'delhi', 'packages', 'free', 'breakthrough', 'repro', 'epitome'],
    content: `BookLeaf Publishing is a leading self-publishing company operating across India and the United States.
Publishing Packages:
- Standard Free: No upfront cost, essential publication support.
- Bestseller Breakthrough: Premium paid package with marketing campaigns and distribution add-ons.
Services:
- Cover design, typesetting, interior formatting, ISBN assignment, printing, distribution, and royalty management.
Facilities & Print Partners:
- In-house printing facility and warehouse located in Delhi.
- Certified external print partners for volume overflow and specialized formats: Repro India and Epitome Books.`,
  },

  royalties: {
    id: 'royalties',
    title: 'Royalty Policy & Payment Terms',
    keywords: ['royalty', 'payment', 'payout', 'money', 'earnings', 'profit', 'bank', 'threshold', 'quarterly', 'commission', 'split', 'statement'],
    content: `Royalty Calculation & Revenue Split (80/20 royalty split):
- Author receives 80% of net profit per book sold; BookLeaf receives 20%.
- Net Profit Formula: Net Profit = MRP - (Printing Cost + Platform Channel Commission [Amazon/Flipkart] + Shipping Charges).
- Author Royalty = 80% * Net Profit.

Payout Schedule & Rules:
- Royalties are calculated on a quarterly schedule (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec).
- Disbursements are issued within 45 days after the respective quarter concludes.
- Minimum Payout Threshold: ₹1,000. Accumulated royalties below ₹1,000 roll over to the subsequent quarter.
- Mode of Payment: Direct bank transfer (NEFT/RTGS/IMPS) to the verified bank account linked in the author's portal.
- Reporting: Authors can access full sales breakdowns per retailer platform directly in their Author Portal dashboard.`,
  },

  isbn: {
    id: 'isbn',
    title: 'ISBN Policy & Imprint Registration',
    keywords: ['isbn', 'barcode', 'imprint', 'metadata', 'mismatch', 'registration', 'duplicate'],
    content: `ISBN Assignment & Rights:
- Every book published through BookLeaf receives a unique, registered ISBN assigned under BookLeaf's official publisher imprint.
- Authors desiring an ISBN under their own personal imprint must procure and provide it independently prior to distribution setup.
- ISBN Discrepancies & Errors: Duplicate ISBNs, mismatched editions, or incorrect book-to-ISBN linkage on retail channels (such as Amazon or Flipkart) are classified as Critical/High-Priority catalog defects. They are immediately escalated to the production and catalog sync team with a strict 48-hour resolution expectation.`,
  },

  printing: {
    id: 'printing',
    title: 'Printing, Binding & Quality Assurance',
    keywords: ['print', 'printing', 'quality', 'binding', 'cover', 'page', 'blurry', 'defect', 'misprint', 'reprint', 'turnaround', 'author copies'],
    content: `Printing Operations:
- Majority of print orders and author copies are manufactured at BookLeaf's central Delhi print hub. Specialized runs or regional overflow are routed to Repro India or Epitome Books.
- Turnaround Time: Standard print production turnaround is 5 to 7 business days from order confirmation, plus standard courier transit.
- Quality Guarantee & Free Reprints: If an author receives defective author copies (verified misprints, binding separation, page misalignment, or major color inconsistency), BookLeaf arranges a 100% free reprint following photo verification. Authors should provide clear photographic evidence of the defect.`,
  },

  distribution: {
    id: 'distribution',
    title: 'Retail Distribution & Channel Availability',
    keywords: ['distribution', 'amazon', 'flipkart', 'store', 'availability', 'unavailable', 'out of stock', 'listing', 'sync', 'listing live'],
    content: `Distribution Networks:
- Active channels include Amazon India, Flipkart, Amazon US, Amazon UK, and the direct BookLeaf Store.
- Listing Timeline: New book listings typically go live across partner networks within 7 to 10 business days following publication completion.
- Channel Availability & Stock Issues: If a published book is marked 'Currently Unavailable' or 'Out of Stock' on Amazon or Flipkart, it almost always signifies a catalog inventory feed de-synchronization rather than a print shortage. BookLeaf's distribution desk triggers a manual channel re-sync, which restores availability within 24 to 48 hours.`,
  },

  production: {
    id: 'production',
    title: 'Book Production Stages & Editorial Milestones',
    keywords: ['production', 'stages', 'timeline', 'status', 'manuscript', 'editing', 'cover design', 'typesetting', 'proofreading', 'progress', 'delay'],
    content: `Production Stages Sequence:
1. Manuscript Received
2. Editing (if opted/included in package)
3. Cover Design (requires author review and approval)
4. Typesetting & Interior Formatting
5. Proofreading & Author Review Rounds
6. ISBN Assignment & Barcode Generation
7. Printing & Author Copies Proofing
8. Distribution Setup & Catalog Feed Ingestion
9. Published & Live

Production Updates & Delays:
- Authors receive status updates as milestones complete.
- Common Bottlenecks: Awaiting author sign-off on cover mockups or author feedback during proofreading revisions.
- Support Policy: Never blame authors for revision cycles; communicate verified stage and concrete next steps transparently.`,
  },

  metadataUpdates: {
    id: 'metadataUpdates',
    title: 'Post-Publication Metadata & Description Changes',
    keywords: ['description', 'metadata', 'update', 'price change', 'author bio', 'blurb', 'synopsis'],
    content: `Metadata Modification Policy:
- Updates to book descriptions, author bios, or promotional blurbs for live titles can be submitted via the Author Portal or directly to the ops desk.
- Retail Reflection: Retailers like Amazon India and Flipkart process metadata feed changes in batches; updates typically reflect on customer-facing store listings within 3 to 5 business days.`,
  },
};

/**
 * Relevant Knowledge Retrieval helper for Cost-Conscious AI prompt building.
 * Matches keywords and categories to avoid sending irrelevant documentation.
 */
export function getRelevantKnowledge(category?: string, queryText?: string): string {
  const sectionsToInclude = new Set<KnowledgeSection>();

  // Always include tone & company overview context
  sectionsToInclude.add(BOOKLEAF_KNOWLEDGE_BASE.company);

  const lowerQuery = (queryText || '').toLowerCase();

  // Match based on category
  if (category) {
    if (category.includes('Royalty') || category.includes('Payment')) {
      sectionsToInclude.add(BOOKLEAF_KNOWLEDGE_BASE.royalties);
    }
    if (category.includes('ISBN') || category.includes('Metadata')) {
      sectionsToInclude.add(BOOKLEAF_KNOWLEDGE_BASE.isbn);
      sectionsToInclude.add(BOOKLEAF_KNOWLEDGE_BASE.metadataUpdates);
    }
    if (category.includes('Printing') || category.includes('Quality')) {
      sectionsToInclude.add(BOOKLEAF_KNOWLEDGE_BASE.printing);
    }
    if (category.includes('Distribution') || category.includes('Availability')) {
      sectionsToInclude.add(BOOKLEAF_KNOWLEDGE_BASE.distribution);
    }
    if (category.includes('Production') || category.includes('Status')) {
      sectionsToInclude.add(BOOKLEAF_KNOWLEDGE_BASE.production);
    }
  }

  // Also match query keywords
  for (const section of Object.values(BOOKLEAF_KNOWLEDGE_BASE)) {
    if (section.keywords.some((kw) => lowerQuery.includes(kw))) {
      sectionsToInclude.add(section);
    }
  }

  return Array.from(sectionsToInclude)
    .map((s) => `### ${s.title}\n${s.content}`)
    .join('\n\n');
}

export const BOOKLEAF_COMMUNICATION_GUIDELINES = `
BookLeaf Official Tone and Communication Principles:
1. Empathetic and Professional: Treat authors as creative partners, never as tickets or complaints to be dismissed.
2. Acknowledge First: Always validate the author's frustration or excitement before jumping into explanations or operational steps.
3. Specific & Factual: Use verified numbers, actual royalty dates, specific book titles, and real production stages. Never offer vague or generic platitudes.
4. Ownership: If BookLeaf or a partner delayed a milestone (e.g. royalty batch delay, print reprint, stock sync), own it honestly without corporate deflection.
5. Concrete Timelines: For investigations or escalations, state clear realistic timelines (e.g., "Our catalog team will resolve the ISBN mapping within 48 hours", "Reprint turnaround is 5-7 business days").
6. Clear Next Step: Always end with a crisp action item for either the author (e.g., "Please reply with 2-3 photos of the binding") or the BookLeaf team ("We have opened ticket #XYZ with the accounts desk").
7. Guardrails: NEVER invent non-existent transaction IDs, bank details, unconfirmed delivery dates, or unverified facts. If data is unknown, state that an investigation has been initiated.
`;
