import { ClassificationResult, PriorityResult, DraftResponse, TicketCategory, TicketPriority } from './types';

/**
 * Intelligent deterministic fallback heuristics for BookLeaf Author Support.
 * Ensures 100% platform uptime and testability even when OpenAI API key is unset or external API is down.
 */

export function heuristicClassify(subject: string, description: string): ClassificationResult {
  const combined = `${subject} ${description}`.toLowerCase();

  // 1. Royalty & Payments
  if (
    combined.includes('royalty') ||
    combined.includes('payment') ||
    combined.includes('payout') ||
    combined.includes('bank account') ||
    combined.includes('net profit') ||
    combined.includes('sold') && combined.includes('money') ||
    combined.includes('threshold') ||
    combined.includes('statement')
  ) {
    const isOverdue = combined.includes('not received') || combined.includes('delayed') || combined.includes('months');
    return {
      category: 'Royalty & Payments',
      confidence: 0.92,
      rationale: 'Identified keywords related to financial disbursements, sales counts, or quarterly royalty cycles.',
      suggestedPriority: isOverdue ? 'High' : 'Medium',
    };
  }

  // 2. ISBN & Metadata Issues
  if (
    combined.includes('isbn') ||
    combined.includes('barcode') ||
    combined.includes('imprint') ||
    (combined.includes('different') && combined.includes('amazon')) ||
    combined.includes('mismatch') ||
    combined.includes('wrong book')
  ) {
    return {
      category: 'ISBN & Metadata Issues',
      confidence: 0.95,
      rationale: 'Identified ISBN catalog identifiers or retail metadata discrepancy.',
      suggestedPriority: 'Critical',
    };
  }

  // 3. Printing & Quality
  if (
    combined.includes('print') ||
    combined.includes('binding') ||
    combined.includes('blurry') ||
    combined.includes('misaligned') ||
    combined.includes('defect') ||
    combined.includes('quality') ||
    combined.includes('misprint') ||
    combined.includes('damaged') ||
    combined.includes('author copies')
  ) {
    return {
      category: 'Printing & Quality',
      confidence: 0.93,
      rationale: 'Identified physical copy manufacturing or print quality defect terms.',
      suggestedPriority: 'High',
    };
  }

  // 4. Distribution & Availability
  if (
    combined.includes('unavailable') ||
    combined.includes('out of stock') ||
    combined.includes('not listed') ||
    combined.includes('amazon live') ||
    combined.includes('flipkart') ||
    combined.includes('distribution') ||
    combined.includes('buy link')
  ) {
    return {
      category: 'Distribution & Availability',
      confidence: 0.91,
      rationale: 'Identified retail distribution channel or listing availability terms.',
      suggestedPriority: 'High',
    };
  }

  // 5. Book Status & Production Updates
  if (
    combined.includes('typesetting') ||
    combined.includes('cover design') ||
    combined.includes('proofreading') ||
    combined.includes('manuscript') ||
    combined.includes('production') ||
    combined.includes('when will it be done') ||
    combined.includes('still in') ||
    combined.includes('editing stage')
  ) {
    return {
      category: 'Book Status & Production Updates',
      confidence: 0.94,
      rationale: 'Identified pre-publication production stage or milestone progress query.',
      suggestedPriority: 'Medium',
    };
  }

  // 6. General Inquiry
  return {
    category: 'General Inquiry',
    confidence: 0.85,
    rationale: 'General administrative or post-publication inquiry without specific defect or payment claim.',
    suggestedPriority: 'Low',
  };
}

export function heuristicScorePriority(
  category: TicketCategory,
  subject: string,
  description: string,
  bookStatus?: string | null
): PriorityResult {
  const combined = `${subject} ${description}`.toLowerCase();

  // Critical conditions
  if (category === 'ISBN & Metadata Issues' || combined.includes('different isbn') || combined.includes('duplicate isbn')) {
    return {
      priority: 'Critical',
      confidence: 0.96,
      rationale: 'Per BookLeaf ISBN Policy, catalog identifier mismatches on public retailers cause severe data contamination and require immediate escalation.',
      escalationRecommended: true,
    };
  }

  // High conditions
  if (
    (category === 'Royalty & Payments' && (combined.includes('months') || combined.includes('overdue') || combined.includes('not received'))) ||
    (category === 'Printing & Quality' && (combined.includes('terrible') || combined.includes('damaged') || combined.includes('defect'))) ||
    (category === 'Distribution & Availability' && combined.includes('unavailable'))
  ) {
    return {
      priority: 'High',
      confidence: 0.91,
      rationale: 'Financial delay exceeding quarterly payout window, physical copy defect eligible for free reprint, or public retail listing blackout.',
      escalationRecommended: true,
    };
  }

  // Low conditions
  if (
    category === 'General Inquiry' ||
    combined.includes('author bio') ||
    combined.includes('description') ||
    combined.includes('thank you')
  ) {
    return {
      priority: 'Low',
      confidence: 0.88,
      rationale: 'Routine metadata or informational request with no active production blockage or financial loss.',
      escalationRecommended: false,
    };
  }

  // Default
  return {
    priority: 'Medium',
    confidence: 0.85,
    rationale: 'Standard operational query requiring investigation within standard support SLA.',
    escalationRecommended: false,
  };
}

export function heuristicDraftResponse(params: {
  authorName: string;
  bookTitle?: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  royaltyPending?: number;
  bankAccountLinked?: boolean;
  productionStage?: string | null;
}): DraftResponse {
  const { authorName, bookTitle, category, subject, description, royaltyPending, bankAccountLinked, productionStage } = params;
  const combined = `${subject} ${description}`.toLowerCase();

  let draftText = '';
  let rationale = '';
  const keyPoints: string[] = [];

  if (category === 'Royalty & Payments') {
    if (combined.includes('not received') || combined.includes('4 months') || combined.includes('delayed')) {
      const pendingStr = royaltyPending !== undefined && royaltyPending > 0 ? `₹${royaltyPending.toLocaleString('en-IN')}` : 'your accumulated royalty balance';
      draftText = `Dear ${authorName},

Thank you for reaching out, and I completely understand your concern regarding your royalty payout. Waiting for earnings can be understandably stressful.

At BookLeaf, royalties follow an 80/20 net profit split and are calculated on a quarterly schedule, with disbursements processed within 45 days after each quarter ends. Our minimum payout threshold is ₹1,000; accumulated balances below this threshold roll over into the next quarter.

${bookTitle ? `For your title '${bookTitle}', ` : ''}Your current pending balance reflects ${pendingStr}. ${bankAccountLinked ? 'We verified that your linked bank account is on record.' : 'Please ensure your verified bank account details are linked in your Author Portal.'} We have escalated this query to our finance desk to trace the latest transaction batch and will provide a concrete status update within 48 hours.

Warm regards,
BookLeaf Author Support Team`;
      rationale = 'Acknowledged delay empathetically, explained quarterly 45-day cycle and ₹1,000 threshold, stated pending balance, and committed to a 48-hour follow-up.';
      keyPoints.push('Quarterly 45-day payout cycle', '₹1,000 threshold', 'Bank linkage check', '48-hour escalation timeline');
    } else {
      draftText = `Dear ${authorName},

Thank you for writing to us. We believe in total financial transparency with our author partners.

At BookLeaf, author earnings are calculated on an 80/20 net profit model:
Net Profit = MRP - (Printing Cost + Retail Platform Commission [Amazon/Flipkart] + Courier/Shipping Charges).
As an author partner, you receive 80% of this net profit for every copy sold.

We would be glad to share a complete line-by-line sales ledger showing copy sales and retailer deductions across Amazon, Flipkart, and the BookLeaf Store. You can also view this breakdown anytime in your Author Dashboard under 'My Books'.

Warm regards,
BookLeaf Operations Desk`;
      rationale = 'Transparent explanation of net-profit formula without defensive posture, offering full line-by-line breakdown.';
      keyPoints.push('80/20 net profit formula', 'Deductions breakdown: printing, platform commission, shipping', 'Dashboard ledger access');
    }
  } else if (category === 'ISBN & Metadata Issues') {
    draftText = `Dear ${authorName},

Thank you for bringing this critical issue to our immediate attention. We sincerely apologize for this discrepancy.

An ISBN mismatch on a retail channel is a high-priority data issue. Every book published through BookLeaf receives a unique ISBN under our official publisher imprint, and ensuring retailers reflect the exact physical copy mapping is vital.

We have immediately escalated this ticket to our senior catalog and distribution engineering team. They will cross-verify the metadata feed sent to the retailer against our central registry and trigger a high-priority correction. We will follow up with confirmation within 48 hours.

Warm regards,
BookLeaf Production & Catalog Operations`;
    rationale = 'Treated as critical data defect, owned directly, escalated to catalog team with strict 48-hour timeline.';
    keyPoints.push('High-priority catalog escalation', 'Imprint metadata verification', '48-hour resolution expectation');
  } else if (category === 'Printing & Quality') {
    draftText = `Dear ${authorName},

Please accept our sincere apologies for the condition of your author copies. We take great pride in our book manufacturing quality, and this clearly falls short of our standard.

Under BookLeaf's Quality Assurance Policy, any verified misprint, binding defect, or page misalignment qualifies for a 100% free reprint. 

To help our production team process this without delay, could you please reply to this ticket with 2 to 3 clear photographs highlighting the affected pages or binding? Once verified by our Delhi facility, we will expedite a reprint with a turnaround of 5 to 7 business days.

Warm regards,
BookLeaf Quality Assurance Desk`;
    rationale = 'Sincere apology, clear free-reprint policy explanation, photo request for verification, 5-7 business day turnaround.';
    keyPoints.push('Apology for print defect', 'Photo request for verification', 'Free reprint policy', '5-7 business day turnaround');
  } else if (category === 'Distribution & Availability') {
    draftText = `Dear ${authorName},

Thank you for notifying us. We understand how frustrating it is when readers cannot purchase your live book.

When a published title shows as 'Currently Unavailable' on Amazon or Flipkart, it typically indicates a catalog stock synchronization glitch between the retailer's automated warehouse feed and our print-on-demand network, rather than a physical shortage.

We have triggered an inventory re-sync with our distribution team. These catalog updates generally propagate across Amazon's servers within 24 to 48 hours, at which point the 'Buy Now' button will be restored. We are monitoring the listing closely.

Warm regards,
BookLeaf Distribution Desk`;
    rationale = 'Explained stock-sync mechanism, initiated re-sync workflow, provided 24-48 hour resolution timeline.';
    keyPoints.push('Stock-sync explanation', 'Distribution re-sync triggered', '24-48 hour availability restoration');
  } else if (category === 'Book Status & Production Updates') {
    const stageName = productionStage ? productionStage.replace(/_/g, ' ').toLowerCase() : 'typesetting';
    draftText = `Dear ${authorName},

Thank you for checking in on the progress of ${bookTitle ? `'${bookTitle}'` : 'your manuscript'}. We know how eagerly you are anticipating your book's release.

Your title is currently in the ${stageName} phase. During this milestone, our formatting specialists structure page spreads, typography hierarchy, and chapter headings to ensure an elegant reading experience.

We are actively advancing your files and expect to deliver your digital review proof within 3 to 4 business days. You will receive an automated notification as soon as the review file is ready for your feedback in your dashboard.

Warm regards,
BookLeaf Editorial Desk`;
    rationale = 'Communicated verified production stage honestly and collaboratively with realistic milestone timeline.';
    keyPoints.push('Current verified production stage', 'Honest milestone progress', 'Updated timeline for proof review');
  } else {
    draftText = `Dear ${authorName},

Thank you for contacting BookLeaf Support.

Regarding metadata and book description updates, changes can be submitted directly through your portal or by replying to this ticket with your revised blurb. Once received, our catalog team submits the updated feed to partner channels (including Amazon and Flipkart). These updates typically reflect live on retailer pages within 3 to 5 business days.

Please let us know if you have any questions or additional details to share!

Warm regards,
BookLeaf Author Support`;
    rationale = 'Clear process explanation for metadata updates with 3-5 business day retail reflection timeline.';
    keyPoints.push('Metadata update process', '3-5 business day retailer update window');
  }

  return {
    draftText,
    rationale,
    keyPointsCovered: keyPoints,
    suggestedNextStep: 'Admin review and personalize before sending.',
  };
}
