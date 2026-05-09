# Memo — Architecture Deep Dive

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          WhatsApp Client                             │
│                   Text · Voice · Images · Documents                  │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │  Baileys WA Web API (WebSocket)
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Fastify API  ·  AWS EC2                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Message Ingestion Layer                      │ │
│  │                                                                 │ │
│  │  · Unwrap ephemeral/view-once message layers (recursive)        │ │
│  │  · Classify message type: text / audio / image / doc / video    │ │
│  │  · Match sender against registered UserPhoneNumbers             │ │
│  │  · Download media → upload to Cloudflare R2                     │ │
│  │  · Persist raw message + metadata to PostgreSQL                 │ │
│  │  · Debounce rapid text messages (3s window → batch combine)     │ │
│  │  · Route: text → Cognitive Pipeline / audio → Whisper           │ │
│  └──────────────────────────────┬──────────────────────────────────┘ │
│                                 │                                    │
│            ┌────────────────────┴──────────────────┐                │
│            ▼                                       ▼                │
│  ┌──────────────────┐                  ┌───────────────────────┐    │
│  │  Whisper         │                  │   Cognitive Pipeline  │    │
│  │  Transcription   │                  │                       │    │
│  │                  │                  │  ┌─────────────────┐  │    │
│  │  faster-whisper  │──── text ───────▶│  │ Context Builder │  │    │
│  │  "small" model   │                  │  │                 │  │    │
│  │  CPU · English   │                  │  │ · Conv history  │  │    │
│  └──────────────────┘                  │  │   (last 20)     │  │    │
│                                        │  │ · Pending acts  │  │    │
│  ┌──────────────────┐                  │  │   (last 30)     │  │    │
│  │  Embedding       │                  │  │ · Completed     │  │    │
│  │  Server          │◀── content ──────│  │   acts (last 5) │  │    │
│  │                  │                  │  │ · Semantic mem  │  │    │
│  │  BGE-small-en    │──── 384-dim ────▶│  │   (top 10 vec) │  │    │
│  │  Persistent proc │    vector        │  │ · Working mem   │  │    │
│  │  stdin/stdout    │                  │  │   (session)     │  │    │
│  └──────────────────┘                  │  │ · Replied-to    │  │    │
│                                        │  │   message       │  │    │
│                                        │  └────────┬────────┘  │    │
│                                        │           │           │    │
│                                        │  ┌────────▼────────┐  │    │
│                                        │  │  Gemini 2.5     │  │    │
│                                        │  │  Flash          │  │    │
│                                        │  │                 │  │    │
│                                        │  │  Skill-driven   │  │    │
│                                        │  │  dynamic prompt │  │    │
│                                        │  │                 │  │    │
│                                        │  │  Extracts:      │  │    │
│                                        │  │  · actions[]    │  │    │
│                                        │  │  · entities[]   │  │    │
│                                        │  │  · memories[]   │  │    │
│                                        │  │  · response     │  │    │
│                                        │  │  · confidence   │  │    │
│                                        │  └────────┬────────┘  │    │
│                                        │           │           │    │
│                                        │  ┌────────▼────────┐  │    │
│                                        │  │  Action Engine  │  │    │
│                                        │  │                 │  │    │
│                                        │  │  create         │  │    │
│                                        │  │  update         │  │    │
│                                        │  │  delete         │  │    │
│                                        │  │  complete       │  │    │
│                                        │  │  reopen         │  │    │
│                                        │  │  query          │  │    │
│                                        │  └────────┬────────┘  │    │
│                                        └───────────┼───────────┘    │
│                                                    │                │
│  ┌─────────────────────────────────────────────────▼─────────────┐  │
│  │                    Autonomous Execution Layer                  │  │
│  │                                                               │  │
│  │   node-cron scheduler  ·  BullMQ + Redis queue                │  │
│  │   · Polls pending scheduled actions every minute              │  │
│  │   · Fires WhatsApp reminders at scheduled time                │  │
│  │   · Handles retries and failure states                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
│   PostgreSQL     │   │      pgvector         │   │  Cloudflare R2   │
│   (Neon)         │   │   Semantic Layer      │   │  Media Storage   │
│                  │   │                       │   │                  │
│  User            │   │  Memory.embedding     │   │  whatsapp/       │
│  Action          │   │  Entity.embedding     │   │  {phone}/        │
│  Entity          │   │  384-dimensional      │   │  {msgId}.ogg     │
│  Memory          │   │  cosine similarity    │   │  {msgId}.jpg     │
│  Relationship    │   │  <=> operator         │   │  {msgId}.pdf     │
│  ConvEvent       │   │  (pgvector extension) │   │                  │
│  CogSession      │   │                       │   │                  │
│  Skill           │   │                       │   │                  │
│  UserSkill       │   │                       │   │                  │
│  WASession       │   │                       │   │                  │
└──────────────────┘   └──────────────────────┘   └──────────────────┘
```

---

## Core Design Decisions

### 1. Universal Cognitive Extraction Schema

Instead of hardcoded intent handlers for every possible user action, the entire system converges on a single structured output format:

```typescript
{
  actions: [{ operation, type, title, resolvedIds, scheduledFor, mutations }],
  entities: [{ type, name, metadata }],
  memories: [{ category, content, entityName, importance }],
  response: string,
  confidence: number,
  needsClarification: boolean
}
```

This means adding a new capability (a new skill, a new action type) requires zero changes to the core pipeline. The AI adapts based on the skill configuration injected into the prompt.

### 2. Skill-Driven Dynamic Prompting

Each user's active skills are compiled into the LLM prompt at runtime. The prompt includes:

- Skill capabilities and supported entity types
- Memory categories the skill can write to
- Supported action types and intents
- Execution rules specific to that skill
- Feature flags (calendar awareness, conflict detection, autonomous execution, semantic search, reasoning, orchestration)
- Example prompts from each skill

The AI's behavior is entirely determined by which skills are active. No code changes needed to extend functionality.

### 3. Multi-Layer Context Assembly

Every message triggers a parallel context fetch across 6 dimensions before the AI sees anything:

| Layer                | Source                                    | Purpose                                           |
| -------------------- | ----------------------------------------- | ------------------------------------------------- |
| Conversation history | `ConversationEvent` table (last 20)       | Multi-turn continuity                             |
| Pending actions      | `Action` table (last 30, status=pending)  | Index-based resolution ("complete the first one") |
| Completed actions    | `Action` table (last 5, status=completed) | Reopen support                                    |
| Semantic memories    | pgvector similarity search (top 10)       | Long-term knowledge retrieval                     |
| Working memory       | `CognitiveSession` (per phone, 1hr TTL)   | Short-term session state                          |
| Replied-to message   | Raw WhatsApp payload parsing              | Pronoun resolution                                |

### 4. Persistent Embedding Server

Rather than spawning a Python subprocess per embedding request (which would add 2–3 seconds of model load time per call), `embed_server.py` loads the BGE-small model once and stays running as a persistent process. It reads queries line-by-line from stdin and outputs 384-dimensional vectors as JSON lines — effectively a zero-overhead embedding microservice.

### 5. Message Debouncing

Humans send fragmented messages. "Add task" → "call Ravi" → "tomorrow 5pm" arrives as three separate WhatsApp messages in 2 seconds. Without debouncing, this would trigger three separate AI calls with incomplete context.

Memo batches messages per phone with a 3-second debounce window. All fragments are combined into one coherent input before the cognitive pipeline runs.

### 6. Pronoun Resolution via Replied-To Context

WhatsApp's reply feature is a first-class context signal. When a user replies to a message and asks "who is he?" or "delete this", Memo extracts the quoted message from the raw payload and uses it as the primary resolution context — not the conversation history. This prevents the common failure mode where pronouns resolve to the wrong entity.

### 7. Auto-Reconnection on Startup

When the API server starts, it automatically reconnects all existing WhatsApp sessions stored in the database. Users never need to re-scan QR codes after a server restart. Sessions are persisted as encrypted credentials in PostgreSQL.

### 8. Entity-Memory Graph

The data model is a lightweight knowledge graph:

- `Entity` nodes represent anything meaningful: people, organizations, products, projects
- `Memory` records are linked to entities via `entityId`
- `Relationship` edges connect entities to each other
- Both entities and memories have vector embeddings for semantic retrieval

Over time, this builds a rich, queryable model of the business's world — customers, their history, their relationships, their context.

---

## Data Flow: Message to Action

```
User sends WhatsApp message
         │
         ▼
Baileys receives WebSocket event
         │
         ▼
Unwrap ephemeral layers → classify type
         │
    ┌────┴────┐
    │         │
  text      audio/media
    │         │
    │    Download → R2 upload
    │    Audio → Whisper transcribe → text
    │         │
    └────┬────┘
         │
    Debounce (3s) → combine fragments
         │
         ▼
    Save to Message table
         │
         ▼
    Build context package (parallel fetches)
         │
         ▼
    Compile skill prompt (dynamic)
         │
         ▼
    Gemini 2.5 Flash → structured JSON extraction
         │
         ▼
    Execute actions (CRUD on Action table)
    Upsert entities (Entity table + embeddings)
    Store memories (Memory table + embeddings)
    Update working memory (CognitiveSession)
         │
         ▼
    Send WhatsApp reply (formatForWhatsApp)
    Store assistant ConversationEvent
         │
         ▼
    Scheduled actions → node-cron fires at time
    → WhatsApp reminder sent autonomously
```

---

## API Surface

| Route                | Method | Description                 |
| -------------------- | ------ | --------------------------- |
| `/auth/signup`       | POST   | Create account              |
| `/auth/signin`       | POST   | Authenticate                |
| `/auth/logout`       | POST   | Clear session               |
| `/me`                | GET    | Current user                |
| `/skills`            | GET    | All available skills        |
| `/skills/me`         | GET    | User's active skills        |
| `/skills/me`         | POST   | Enable a skill              |
| `/skills/me/:id`     | DELETE | Disable a skill             |
| `/phone-numbers`     | GET    | Registered numbers          |
| `/phone-numbers`     | POST   | Add numbers (bulk)          |
| `/phone-numbers/:id` | DELETE | Remove number               |
| `/connect`           | GET    | Initiate WA connection      |
| `/disconnect`        | GET    | Disconnect + delete session |
| `/link`              | GET    | QR code page                |
| `/link/status`       | GET    | Live connection status      |

---

## Infrastructure

| Component        | Service                              |
| ---------------- | ------------------------------------ |
| API hosting      | AWS EC2                              |
| Database         | Neon (PostgreSQL, serverless)        |
| Vector search    | pgvector extension                   |
| Media storage    | Cloudflare R2                        |
| Cache / Queue    | Redis + BullMQ                       |
| AI               | Google Gemini 2.5 Flash              |
| Embeddings       | BAAI/bge-small-en-v1.5 (self-hosted) |
| Transcription    | faster-whisper (self-hosted, CPU)    |
| Frontend hosting | Render                               |
