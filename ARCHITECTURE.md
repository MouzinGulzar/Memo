# Memo - System Architecture & Technology Stack

## 📋 Project Overview

**Memo** is an intelligent AI-powered personal assistant that operates through WhatsApp. It processes natural language messages, extracts cognitive intent, manages tasks/reminders/notes, stores memories, and provides contextual responses. The system uses a skill-based architecture where users can enable different capabilities (task management, scheduling, note-taking, etc.) dynamically.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    (WhatsApp via Baileys)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FASTIFY API SERVER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Auth Module  │  │ WhatsApp     │  │ Skills       │         │
│  │ (JWT/bcrypt) │  │ Connection   │  │ Management   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COGNITIVE PROCESSING LAYER                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Intent       │  │ Context      │  │ Action       │         │
│  │ Extraction   │  │ Builder      │  │ Executor     │         │
│  │ (Gemini AI)  │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA PERSISTENCE LAYER                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PostgreSQL   │  │ Cloudflare   │  │ Redis        │         │
│  │ (Neon)       │  │ R2 (S3)      │  │ (BullMQ)     │         │
│  │ + pgvector   │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKGROUND PROCESSING                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Whisper      │  │ Embeddings   │  │ Scheduler    │         │
│  │ Transcription│  │ (Python)     │  │ (node-cron)  │         │
│  │ (Python)     │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### **Backend Framework**
- **Fastify** (v5.8.5) - High-performance Node.js web framework
  - Chosen for speed, low overhead, and excellent TypeScript support
  - Built-in schema validation and serialization
  - Plugin architecture for modular design

### **Language & Runtime**
- **TypeScript** (v6.0.3) - Type-safe JavaScript
- **Node.js** - JavaScript runtime
- **tsx** (v4.21.0) - TypeScript execution and hot-reload for development

### **Database & ORM**
- **PostgreSQL** (via Neon serverless) - Primary relational database
  - **pgvector extension** - Vector embeddings for semantic search
  - Stores users, messages, actions, memories, entities, skills
- **Prisma** (v6.19.3) - Type-safe ORM
  - Schema-first approach
  - Automatic migrations
  - Type generation for database models

### **Authentication & Security**
- **bcrypt** - Password hashing (12 salt rounds)
- **jsonwebtoken (JWT)** - Stateless authentication tokens (30-day expiry)
- **API Key authentication** - Per-user API keys for programmatic access

### **WhatsApp Integration**
- **@whiskeysockets/baileys** (v7.0.0-rc10) - WhatsApp Web API client
  - Multi-device support
  - QR code authentication
  - Media download/upload
  - Real-time message handling
  - Session persistence via Prisma
- **qrcode** (v1.5.4) - QR code generation for WhatsApp pairing

### **AI & Machine Learning**
- **Google Gemini AI** (v2.5-flash via @google/genai v2.0.0)
  - Natural language understanding
  - Intent extraction
  - Cognitive processing
  - Structured JSON output
- **Whisper** (via Python subprocess) - Audio transcription
  - Converts voice messages to text
  - Local execution for privacy
- **Sentence Transformers** (Python) - Text embeddings
  - 384-dimensional vectors
  - Semantic similarity search
  - Memory retrieval

### **File Storage**
- **Cloudflare R2** (S3-compatible) - Object storage
  - Stores WhatsApp media (audio, images, videos, documents)
  - Cost-effective alternative to AWS S3
  - **@aws-sdk/client-s3** (v3.1045.0) - S3 client library

### **Task Queue & Scheduling**
- **BullMQ** (v5.76.6) - Redis-based job queue
  - Background job processing
  - Retry logic
  - Job prioritization
- **ioredis** (v5.10.1) - Redis client
- **node-cron** (v4.2.1) - Cron job scheduler
  - Reminder execution (runs every minute)
  - Scheduled action processing

### **Utilities**
- **zod** (v4.4.3) - Runtime type validation and schema parsing
- **dotenv** (v17.4.2) - Environment variable management
- **chrono-node** (v2.9.1) - Natural language date/time parsing
- **pino** (v10.3.1) + **pino-pretty** (v13.1.3) - Structured logging

### **Python Dependencies** (Background Workers)
- **Whisper** - OpenAI's speech-to-text model
- **sentence-transformers** - Embedding generation
- **torch** - PyTorch for ML models

---

## 📂 Project Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma              # Database schema definition
│   └── migrations/                # Database migration history
├── python/
│   ├── transcribe.py              # Whisper audio transcription
│   ├── embed.py                   # Text embedding generation
│   └── embed_server.py            # Persistent embedding server
├── src/
│   ├── core/                      # Core business logic
│   │   ├── auth/
│   │   │   └── apiKeyAuth.ts      # API key middleware
│   │   ├── cognitive/             # AI cognitive processing
│   │   │   ├── processor.ts       # Main cognitive pipeline
│   │   │   ├── context.ts         # Context builder
│   │   │   ├── actions.ts         # Action executor
│   │   │   ├── response.ts        # Response generator
│   │   │   └── session.ts         # Working memory manager
│   │   ├── db/
│   │   │   └── prisma.ts          # Prisma client singleton
│   │   ├── whatsapp/
│   │   │   ├── connection.ts      # WhatsApp socket manager
│   │   │   └── prismaAuth.ts      # Session persistence
│   │   ├── embeddings.ts          # Embedding service
│   │   ├── transcribe.ts          # Audio transcription service
│   │   ├── scheduler.ts           # Cron job scheduler
│   │   ├── r2.ts                  # Cloudflare R2 client
│   │   └── uploadFile.ts          # File upload utility
│   ├── modules/                   # API route modules
│   │   ├── auth/
│   │   │   └── routes.ts          # Signup/signin endpoints
│   │   ├── skills/
│   │   │   └── routes.ts          # Skills management endpoints
│   │   ├── whatsapp/
│   │   │   └── routes.ts          # WhatsApp connection endpoints
│   │   └── phoneNumbers/
│   │       └── routes.ts          # Phone number management
│   └── server.ts                  # Main application entry point
├── temp/                          # Temporary audio files
├── .env                           # Environment variables
├── package.json                   # Node.js dependencies
└── tsconfig.json                  # TypeScript configuration
```

---

## 🔄 Data Flow & Processing Pipeline

### **1. Message Ingestion (WhatsApp → Database)**

```
User sends WhatsApp message
         ↓
Baileys receives message event
         ↓
Extract sender phone & message type
         ↓
Match against user's registered phone numbers
         ↓
┌─────────────────────────────────────┐
│ Text Message                        │
│  → Store in Message table           │
│  → Trigger cognitive processing     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Audio Message                       │
│  → Download media buffer            │
│  → Upload to Cloudflare R2          │
│  → Store in Message table           │
│  → Trigger Whisper transcription    │
│  → After transcription: cognitive   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Image/Video/Document                │
│  → Download media buffer            │
│  → Upload to Cloudflare R2          │
│  → Store in Message table           │
│  → (Future: OCR/Vision processing)  │
└─────────────────────────────────────┘
```

### **2. Cognitive Processing Pipeline**

```
Message text received
         ↓
Store as ConversationEvent (role: user)
         ↓
Check if user has active skills
         ↓ (if no skills)
Send "configure skills" message → END
         ↓ (if skills exist)
Build Context Package:
  - Current time/date
  - Replied-to message (if any)
  - Recent conversation history (last 15 messages)
  - Working memory (pending clarifications, last action list)
  - Pending actions (tasks/reminders)
  - Recently completed actions
  - Relevant memories (semantic search via embeddings)
         ↓
Send to Gemini AI with:
  - User's active skills configuration
  - Context package
  - Extraction rules
  - JSON schema
         ↓
Gemini returns CognitiveExtraction:
  {
    actions: [...],        // Operations to perform
    entities: [...],       // People/places/things mentioned
    memories: [...],       // Facts to remember
    response: "...",       // Text to send back
    confidence: 0.8,
    needsClarification: false
  }
         ↓
┌─────────────────────────────────────┐
│ If needsClarification = true        │
│  → Store in working memory          │
│  → Send clarification question      │
│  → Wait for user response           │
│  → END                              │
└─────────────────────────────────────┘
         ↓
Execute Actions:
  - create: Create new task/reminder/note
  - update: Modify existing action
  - delete: Remove action
  - complete: Mark action as done
  - reopen: Restore completed action
  - query: Fetch actions (tasks/reminders)
         ↓
Store Entities:
  - Upsert into MemoryEntity table
  - Generate embeddings for semantic search
         ↓
Store Memories:
  - Save to MemoryEvent table
  - Generate embeddings
  - Link to entities if applicable
         ↓
Generate Response:
  - If query action: Generate natural language summary
  - Otherwise: Use Gemini's response
         ↓
Send WhatsApp message
         ↓
Store as ConversationEvent (role: assistant)
         ↓
END
```

### **3. Scheduled Action Execution**

```
Cron job runs every minute
         ↓
Query Action table for:
  - status = "pending"
  - scheduledFor <= NOW
         ↓
For each action:
  - Update status to "processing"
  - Send WhatsApp reminder message
  - Update status to "completed"
  - Store as ConversationEvent
```

---

## 🗄️ Database Schema (Key Models)

### **User**
- `id` (cuid) - Primary key
- `apiKey` (unique) - For API authentication
- `phone` (unique) - User's primary phone number
- `name` - User's display name
- `password` - Hashed password (bcrypt)
- `createdAt` - Account creation timestamp

### **WhatsAppSession**
- `id` (cuid)
- `userId` (unique, FK to User)
- `phone` - WhatsApp-connected phone number
- `creds` - Stringified Baileys credentials
- `keys` - Stringified Baileys session keys
- `createdAt`, `updatedAt`

### **UserPhoneNumber**
- `id` (cuid)
- `userId` (FK to User)
- `phone` (unique) - Registered phone number
- `label` - Optional label (e.g., "Personal", "Work")
- Allows users to receive messages from multiple numbers

### **Skill**
- `id` (uuid)
- `key` (unique) - Skill identifier (e.g., "task_management")
- `name` - Display name
- `description`, `shortDescription`
- `category` - Skill category
- `capabilities` (JSON) - List of capabilities
- `supportedEntities` (JSON) - Entity types (task, reminder, note)
- `supportedActions` (JSON) - Action types
- `supportedIntents` (JSON) - Intent types
- `memoryCategories` (JSON) - Memory categories
- `triggers` (JSON) - Trigger conditions
- Feature flags: `calendarAwarenessEnabled`, `conflictDetectionEnabled`, `semanticSearchEnabled`, etc.
- `isEnabled` - Active/inactive status

### **UserSkill**
- `id` (cuid)
- `userId` (FK to User)
- `skillId` (FK to Skill)
- `createdAt`
- Unique constraint on (userId, skillId)

### **Message**
- `id` (cuid)
- `userId` (FK to User)
- `platform` - "whatsapp"
- `userPhone` - Sender's phone number
- `type` - "text", "audio", "image", "video", "document"
- `text` - Message content or caption
- `storageKey` - R2 object key for media
- `mimeType` - Media MIME type
- `rawPayload` (JSON) - Original Baileys message object
- `processedText` - Transcribed text (for audio)
- `processingStatus` - "pending", "processing", "completed", "failed"
- `intent` - Extracted intent
- `intentData` (JSON) - Full cognitive extraction
- `createdAt`

### **Action**
- `id` (cuid)
- `userId` (FK to User)
- `userPhone` - Associated phone number
- `type` - "task", "reminder", "note", "follow_up", "appointment"
- `title` - Action title
- `description` - Detailed description
- `status` - "pending", "processing", "completed", "failed"
- `scheduledFor` - Scheduled execution time
- `sourceMessageId` (FK to Message)
- `metadata` (JSON) - Additional context
- `createdAt`, `completedAt`

### **MemoryEvent**
- `id` (cuid)
- `userPhone` - Associated phone number
- `type` - Memory category
- `title` - Memory title
- `content` - Memory content
- `sourceMessageId` (FK to Message)
- `importance` - 0.0 to 1.0
- `metadata` (JSON)
- `embedding` (vector(384)) - Semantic embedding
- `createdAt`

### **MemoryEntity**
- `id` (cuid)
- `userPhone` - Associated phone number
- `entityType` - "person", "place", "organization", "product", etc.
- `title` - Entity name
- `canonicalData` (JSON) - Structured entity data
- `sourceEventId` (FK to MemoryEvent)
- `embedding` (vector(384)) - Semantic embedding
- `createdAt`, `lastUpdatedAt`

### **ConversationEvent**
- `id` (cuid)
- `userId` (FK to User)
- `userPhone` - Associated phone number
- `role` - "user" or "assistant"
- `message` - Message text
- `createdAt`

### **ConversationSession**
- `id` (cuid)
- `userPhone` (unique) - Associated phone number
- `workingMemory` (JSON) - Temporary context
  - `pendingClarification` - Awaiting user response
  - `lastActionList` - Recently queried actions
- `expiresAt` - Session expiry
- `updatedAt`

---

## 🔐 Authentication & Authorization

### **API Key Authentication**
- Every user has a unique `apiKey` (64-character hex string)
- Provided via `x-api-key` header or `apiKey` query parameter
- Middleware validates API key and attaches `request.user`
- Public routes: `/`, `/auth/signup`, `/auth/signin`

### **JWT Authentication**
- Issued on signup/signin
- Payload: `{ userId, phone }`
- Expiry: 30 days
- Can be used for future mobile/web clients

### **Password Security**
- Passwords hashed with bcrypt (12 salt rounds)
- Never stored in plaintext
- Never returned in API responses

---

## 🧠 AI & Cognitive Features

### **Intent Extraction**
- Uses Google Gemini 2.5 Flash model
- Structured JSON output with Zod validation
- Extracts:
  - **Actions**: Operations to perform (create, update, delete, complete, reopen, query)
  - **Entities**: People, places, organizations mentioned
  - **Memories**: Facts, preferences, decisions to remember
  - **Response**: Natural language reply
  - **Confidence**: 0.0 to 1.0
  - **Needs Clarification**: Boolean flag

### **Context Building**
- **Temporal Context**: Current date/time, day of week
- **Conversational Context**: Last 15 messages
- **Working Memory**: Pending clarifications, last action list
- **Action Context**: Pending and recently completed actions
- **Semantic Memory**: Relevant memories via vector similarity search
- **Replied Message Context**: If user replies to a message, that message is primary context

### **Skill-Based Architecture**
- Users enable skills (e.g., Task Management, Scheduling, Note-Taking)
- Each skill defines:
  - Supported entities (task, reminder, note)
  - Supported actions (create, update, delete)
  - Supported intents (query, clarify)
  - Memory categories (preference, fact, decision)
  - Execution rules (custom behavior)
  - Feature flags (calendar awareness, conflict detection, etc.)
- AI prompt dynamically adapts based on active skills

### **Semantic Search**
- Text embeddings generated via sentence-transformers (Python)
- 384-dimensional vectors stored in PostgreSQL with pgvector
- Used for:
  - Retrieving relevant memories
  - Entity matching
  - Contextual recall

### **Audio Transcription**
- Whisper model (local execution)
- Converts voice messages to text
- Triggers cognitive processing after transcription

---

## 🚀 Deployment & Scalability

### **Current Setup**
- **Server**: Ubuntu 8GB (Hel1-3)
- **Database**: Neon PostgreSQL (serverless)
- **Storage**: Cloudflare R2
- **Queue**: Redis (for BullMQ)

### **Scalability Considerations**
- **Horizontal Scaling**: Fastify can run multiple instances behind a load balancer
- **Database**: Neon supports connection pooling and auto-scaling
- **Storage**: R2 is globally distributed and scales automatically
- **Queue**: Redis can be clustered for high availability
- **AI**: Gemini API scales automatically; consider caching for repeated queries

### **Performance Optimizations**
- **Message Batching**: Rapid consecutive messages are debounced (3-second window)
- **Persistent Embedding Server**: Python subprocess stays alive to avoid model reload overhead
- **Connection Pooling**: Prisma manages database connections efficiently
- **Async Processing**: Audio transcription and cognitive processing run asynchronously

---

## 🔧 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=memo

# AI
GEMINI_API_KEY=...
GLM_API_KEY=...

# Auth
JWT_SECRET=...
```

---

## 📊 Key Metrics & Monitoring

### **Logging**
- Structured JSON logs via Pino
- Log levels: trace, debug, info, warn, error, fatal
- Pretty-printed in development

### **Error Handling**
- Try-catch blocks around critical operations
- Graceful degradation (e.g., if transcription fails, message is still stored)
- Automatic WhatsApp reconnection on connection loss

### **Health Checks**
- `GET /` - Returns `{ status: "ok" }`
- `GET /me` - Returns authenticated user info

---

## 🛡️ Security Best Practices

1. **Password Hashing**: bcrypt with 12 salt rounds
2. **API Key Validation**: Middleware checks on every request
3. **Environment Variables**: Secrets stored in `.env`, never committed
4. **Input Validation**: Zod schemas for all API inputs
5. **SQL Injection Prevention**: Prisma ORM with parameterized queries
6. **CORS**: Can be configured via Fastify plugin
7. **Rate Limiting**: Can be added via Fastify plugin
8. **Session Isolation**: Each user's WhatsApp session is isolated

---

## 🔮 Future Enhancements

1. **Multi-Platform Support**: Telegram, Slack, Discord
2. **Voice Responses**: Text-to-speech for audio replies
3. **Image Understanding**: OCR and vision models for image messages
4. **Proactive Reminders**: AI-driven proactive suggestions
5. **Collaborative Skills**: Shared skills across teams
6. **Analytics Dashboard**: User insights and usage metrics
7. **Mobile/Web App**: Native clients with JWT authentication
8. **Multi-Language Support**: i18n for global users

---

## 📚 API Endpoints Summary

### **Authentication**
- `POST /auth/signup` - Create new user account
- `POST /auth/signin` - Login with phone & password

### **Skills**
- `GET /skills` - List all available skills
- `GET /skills/me` - Get user's active skills
- `POST /skills/me` - Add a skill to user
- `DELETE /skills/me/:skillId` - Remove a skill from user

### **WhatsApp**
- `POST /whatsapp/connect` - Initiate WhatsApp connection
- `GET /whatsapp/qr` - Get QR code for pairing
- `GET /whatsapp/status` - Check connection status
- `POST /whatsapp/disconnect` - Disconnect WhatsApp

### **Phone Numbers**
- `GET /phone-numbers` - List user's registered phone numbers
- `POST /phone-numbers` - Add a new phone number
- `DELETE /phone-numbers/:id` - Remove a phone number

### **User**
- `GET /me` - Get authenticated user info

---

## 🎯 Key Differentiators

1. **Skill-Based Architecture**: Modular, extensible capabilities
2. **Cognitive Processing**: Advanced AI-driven intent extraction
3. **Semantic Memory**: Vector-based memory retrieval
4. **Multi-Phone Support**: Users can receive messages from multiple numbers
5. **Media Handling**: Audio transcription, image/video storage
6. **Contextual Awareness**: Deep conversation history and working memory
7. **Scheduled Actions**: Cron-based reminder execution
8. **WhatsApp Native**: Seamless integration with WhatsApp Web

---

## 📞 Contact & Support

For questions about this architecture, contact the development team or refer to the codebase documentation.

---

**Last Updated**: May 9, 2026  
**Version**: 1.0  
**Maintainer**: DevSec Team
