import { NextResponse } from 'next/server';

export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'BookLeaf Author Support & Communication Portal API',
      version: '1.0.0',
      description:
        'REST API for BookLeaf Publishing operations: author book & royalty management, ticket submission, operations queue, and AI response drafting.',
      contact: {
        name: 'BookLeaf Engineering',
        email: 'dev@bookleafpublishing.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    paths: {
      '/api/auth/login': {
        post: {
          summary: 'Authenticate author or admin',
          description: 'Validates email and password, creates secure HttpOnly session cookie.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'vikram.seth@example.com' },
                    password: { type: 'string', example: 'AuthorPass@2026' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Authentication successful with session cookie set.' },
            401: { description: 'Invalid email or password.' },
            429: { description: 'Rate limit exceeded (max 5 attempts/min).' },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          summary: 'Destroy session and logout',
          responses: {
            200: { description: 'Session destroyed.' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          summary: 'Get active session profile',
          responses: {
            200: { description: 'Authenticated user profile.' },
            401: { description: 'Not authenticated.' },
          },
        },
      },
      '/api/author/books': {
        get: {
          summary: 'List books of authenticated author',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['ALL', 'PUBLISHED', 'IN_PRODUCTION'] } },
            { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['copiesSold', 'mrp', 'title'] } },
          ],
          responses: {
            200: { description: 'List of books and aggregated royalty summary.' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/author/tickets': {
        get: {
          summary: 'List tickets created by authenticated author',
          responses: {
            200: { description: 'Tickets array (internal notes omitted).' },
          },
        },
        post: {
          summary: 'Submit a new support ticket',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['subject', 'description'],
                  properties: {
                    bookId: { type: 'string', nullable: true },
                    queryType: { type: 'string', enum: ['BOOK_SPECIFIC', 'GENERAL_ACCOUNT'] },
                    subject: { type: 'string', example: 'Royalty payout inquiry' },
                    description: { type: 'string', example: 'I published 4 months ago...' },
                    attachmentUrl: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Ticket safely persisted and enriched by AI.' },
            400: { description: 'Validation failed.' },
          },
        },
      },
      '/api/author/tickets/{ticketId}': {
        get: {
          summary: 'Get author ticket detail and public message history',
          parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Ticket details with public messages.' },
            403: { description: 'IDOR check failed: author does not own this ticket.' },
          },
        },
        post: {
          summary: 'Author posts a reply to their ticket',
          parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: { message: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Reply posted and SSE broadcast triggered.' },
          },
        },
      },
      '/api/author/tickets/{ticketId}/events': {
        get: {
          summary: 'Server-Sent Events (SSE) stream for real-time ticket updates',
          parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'SSE stream (text/event-stream).' },
          },
        },
      },
      '/api/admin/tickets': {
        get: {
          summary: 'List all operational support tickets (Admin only)',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'priority', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            200: { description: 'Paginated tickets with author and book summary.' },
            403: { description: 'Forbidden: Admin only.' },
          },
        },
      },
      '/api/admin/tickets/{ticketId}': {
        get: {
          summary: 'Get complete admin workspace for a ticket',
          description: 'Includes private internal notes, AI rationale, confidence, and audit activity.',
          parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Full workspace object.' },
          },
        },
        patch: {
          summary: 'Update ticket status, override category, or override priority',
          parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
                    category: { type: 'string' },
                    priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
                    assignedAdminId: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Ticket updated and overrides recorded.' },
          },
        },
      },
      '/api/admin/tickets/{ticketId}/messages': {
        post: {
          summary: 'Admin sends a public reply to the author',
          parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string' },
                    updateStatus: { type: 'string', enum: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Public message delivered and broadcast via SSE.' },
          },
        },
      },
      '/api/admin/tickets/{ticketId}/notes': {
        post: {
          summary: 'Admin adds a private internal note',
          description: 'Private to admins only. Never shown to authors or broadcast to SSE.',
          parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['note'],
                  properties: { note: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Private internal note saved.' },
          },
        },
      },
      '/api/admin/tickets/{ticketId}/ai/classify': {
        post: {
          summary: 'Trigger AI auto-classification and priority scoring',
          description: 'Preserves any existing human overrides.',
          parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Classification and priority scored.' },
          },
        },
      },
      '/api/admin/tickets/{ticketId}/ai/draft': {
        post: {
          summary: 'Generate grounded AI response draft based on BookLeaf Knowledge Base',
          description: 'Draft only. Never auto-sent to the author.',
          parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Draft generated and saved for editing.' },
          },
        },
      },
      '/api/admin/stats': {
        get: {
          summary: 'Get operational analytics and ticket queue health',
          responses: {
            200: { description: 'Metrics, category distributions, priority counts, and activity stream.' },
          },
        },
      },
      '/api/admin/authors': {
        get: {
          summary: 'List authors with sales and support summaries',
          responses: {
            200: { description: 'List of authors.' },
          },
        },
      },
    },
  };

  return NextResponse.json(spec);
}
