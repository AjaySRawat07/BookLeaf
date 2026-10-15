# BookLeaf Author Support & Communication Portal
## Architecture, Priorities, Trade-offs & Production Evolution (Brief Write-Up)

**Candidate/Architect:** Senior Full-Stack Software Architect & Engineer  
**Document Scope:** Technical Assignment 1 of 2 — Architecture Brief  
**Authoritative Reference:** `FULLSTACK-ASSIGNMENT1.pdf`

---

### 1. What Was Prioritised

1. **AI Safety, Grounding, and Knowledge Base Fidelity (25% Weight):**
   - Implemented a server-only AI integration (`src/lib/ai/`) that strictly separates untrusted author input from system instructions via XML demarcation (`<untrusted_author_input>`) to prevent prompt injections.
   - Grounded all draft replies in the official BookLeaf Knowledge Base (80/20 royalty split, quarterly cycle with 45-day window, ₹1,000 threshold rollover, Repro India / Epitome print partners, 5–7 day reprints, 24–48 hour stock re-sync, and 9-stage production tracker).
   - Enforced schema validation using Zod for all classification and priority outputs.
   - Built a high-accuracy heuristic fallback engine so that external LLM API outages or rate limits never prevent ticket creation, classification, or human triage.
   - Enforced human-in-the-loop: AI drafts are editable staging artifacts and are **never automatically sent** to authors. Human overrides are immutable to background re-runs.

2. **Security & Strict Multi-Tenant Data Isolation (IDOR Protection):**
   - Enforced ownership verification at the database service layer, not just in route middleware.
   - Ensured authors can only query their own books and tickets.
   - Enforced strict filtering of private internal notes (`isInternalNote: true`) so they are never returned to authors in REST responses or Server-Sent Events (SSE).
   - Protected sessions with HttpOnly, SameSite cookies and JWTs signed with HS256, alongside sliding-window rate limiters.

3. **Domain Realism & Edge-Case Completeness:**
   - Seeded the exact 10 authors and 18 books with zero financial tampering, accurately modeling books in production (*Echoes of the Ghats*, *The Silicon Monks*), books below the ₹1,000 rollover threshold, and high-earning catalog titles.
   - Implemented real-time ticket streaming using standard Server-Sent Events (SSE) with clean connection lifecycles.

---

### 2. Architectural Trade-offs Made

| Decision | Chosen Approach | Trade-off & Justification |
| :--- | :--- | :--- |
| **Local DB Engine** | SQLite via Prisma for development; separate PostgreSQL schema (`prisma/schema.postgresql.prisma`) for production | Enables instant zero-dependency local evaluation without requiring external Docker or PostgreSQL services running on the grader's machine, while maintaining 100% type-safe PostgreSQL parity. |
| **Real-time Protocol** | Server-Sent Events (SSE) over WebSockets | SSE works natively over HTTP/2, requires no socket handshake servers or stateful connection brokers, passes through corporate proxies, and is ideal for unidirectional server-to-client ticket notifications. |
| **Knowledge Base Retrieval** | Dynamic Rule-Based Substring & Category Context Extraction | For a compact, authoritative corporate policy (~15 rules), deterministic section retrieval avoids the infrastructure complexity, latency, and vector search non-determinism of a full RAG vector store while keeping token usage minimal. |
| **Authentication Architecture** | Stateless Signed JWT in HttpOnly Cookies (`jose`) | Avoids unnecessary Redis lookups during local evaluation while maintaining robust CSRF protection, expiration, and role-based route gating. |

---

### 3. How This System Would Evolve in Production

If deployed to serve BookLeaf’s scale (1,200+ monthly books, 22,000+ catalog titles, tens of thousands of authors):

1. **Decoupled Asynchronous Job Queues (BullMQ / Redis / SQS):**
   - Offload AI classification, priority scoring, and draft generation to asynchronous worker pools.
   - Prevents spike loads or LLM timeouts from impacting web request latencies.
2. **Hybrid RAG with Vector Embeddings (pgvector / Pinecone):**
   - As BookLeaf policies expand (contracts, legal addendums, foreign rights), transition to vector chunking and semantic search over policy documents and historical high-rated support resolutions.
3. **Enterprise PostgreSQL with Row-Level Security (RLS):**
   - Enforce database-level tenant isolation via Postgres RLS policies based on the session's authenticated author ID.
4. **Author Notification Fan-Out (Webhooks, Email & WhatsApp):**
   - Integrate SendGrid and WhatsApp Business API to notify authors when an admin responds to a ticket or when production advances.
5. **Real-time Horizontal Scaling via Redis Pub/Sub:**
   - Power the SSE ticket streams with Redis Pub/Sub backplanes across multi-instance serverless or containerized clusters.
6. **Observability & LLM Evaluation Harness:**
   - Integrate OpenTelemetry and Langfuse/Arize Phoenix to monitor prompt latency, token costs, hallucination rates, and drift across model versions.
