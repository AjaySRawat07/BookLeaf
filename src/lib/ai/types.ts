import { z } from 'zod';

export const VALID_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
] as const;

export type TicketCategory = (typeof VALID_CATEGORIES)[number];

export const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

export type TicketPriority = (typeof VALID_PRIORITIES)[number];

export const ClassificationResultSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(5),
  suggestedPriority: z.enum(VALID_PRIORITIES).optional(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const PriorityResultSchema = z.object({
  priority: z.enum(VALID_PRIORITIES),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(5),
  escalationRecommended: z.boolean().default(false),
});

export type PriorityResult = z.infer<typeof PriorityResultSchema>;

export const DraftResponseSchema = z.object({
  draftText: z.string().min(20),
  rationale: z.string().min(5),
  keyPointsCovered: z.array(z.string()).default([]),
  suggestedNextStep: z.string().optional(),
});

export type DraftResponse = z.infer<typeof DraftResponseSchema>;
