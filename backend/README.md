# EPSON Chatbot Backend - Documentation

## 📋 Overview

This backend provides:
- **User Authentication** (Register, Login) via JWT tokens
- **Role-Based Access Control** (Customer, Admin, Customer Service)
- **AI Chat Interface** powered by RAG model
- **Automatic Escalation** to CS when needed
- **Admin Dashboard** for monitoring and user management

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── index.ts                 # Main app entry point
│   ├── config/
│   │   ├── supabase.ts         # Supabase client setup
│   │   └── ai.ts               # RAG model integration
│   ├── middleware/
│   │   └── auth.ts             # JWT & role verification
│   ├── routes/
│   │   ├── auth.ts             # Register/Login
│   │   ├── chat.ts             # Customer chat with RAG
│   │   ├── escalation.ts       # Chat escalation logic
│   │   ├── cs.ts               # Customer Service endpoints
│   │   └── admin.ts            # Admin management
│   ├── models/
│   │   └── types.ts            # TypeScript interfaces
│   └── utils/
│       └── (utilities)
├── package.json
├── tsconfig.json
├── .env
├── .env.example
└── README.md
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

This installs:
- `express` - Web framework
- `@supabase/supabase-js` - Database client
- `jsonwebtoken` - JWT auth
- `bcryptjs` - Password hashing
- `cors` - Cross-origin requests
- `axios` - HTTP client for RAG
- `typescript` - Type safety
- `tsx` - TypeScript runner for development

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (for server operations)
- `SUPABASE_DB_PASSWORD` - PostgreSQL password
- `JWT_SECRET` - Secret key for JWT tokens (change this!)
- `RAG_API_URL` - Where your RAG model is running (e.g., `http://localhost:5000`)

### 3. Start the Backend

```bash
npm run dev
# or
node --loader tsx src/index.ts
```

Server will start at `http://localhost:3001`

Health check: `GET http://localhost:3001/health`

---

## 🔐 Authentication Flow

### User Registration (Customer Only)

```
POST /api/auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "securepass123",
  "full_name": "John Doe"
}

Response:
{
  "message": "Registrasi berhasil!",
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "full_name": "John Doe",
    "role": "customer"
  }
}
```

**Note:** Only customers can self-register. Admin and CS accounts are created by admin.

### User Login (All Roles)

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "securepass123"
}

Response:
{
  "message": "Login berhasil!",
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "full_name": "John Doe",
    "role": "customer"
  }
}
```

All subsequent requests must include the token in the Authorization header:

```
Authorization: Bearer eyJhbGc...
```

---

## 💬 Chat System

### 1. Customer Sends Message

```
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Printer saya tidak bisa mencetak",
  "image_url": "data:image/jpeg;base64,..." (optional),
  "chat_id": "uuid" (optional, for existing chat)
}

Response:
{
  "chat_id": "uuid",
  "message": "RAG model response...",
  "status": "ai" or "waiting_cs",
  "needs_escalation": false,
  "tokens_used": 154
}
```

**Flow:**
1. ✅ Customer sends message
2. 📡 Message saved to DB
3. 🤖 RAG model processes message
4. 🔍 Check if escalation needed
5. 💾 AI response saved to DB
6. ↩️ Response sent to customer

### 2. Get Chat History

```
GET /api/chat/{chatId}
Authorization: Bearer <token>

Response:
{
  "chat": {
    "id": "uuid",
    "customer_id": "uuid",
    "status": "ai",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "...",
      "created_at": "..."
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "...",
      "created_at": "..."
    }
  ]
}
```

### 3. List All Chats

```
GET /api/chat
Authorization: Bearer <token>

Response:
{
  "chats": [
    {
      "id": "uuid",
      "title": "Printer tidak bisa mencetak...",
      "status": "ai",
      "preview": "...",
      "created_at": "..."
    }
  ]
}
```

---

## ⬆️ Escalation System

### How Escalation Works

**Automatic Escalation:**
- If RAG model returns `needs_escalation: true` → Chat status becomes `waiting_cs`
- If RAG model response contains "diluar ranah" or similar → Auto-escalate
- If RAG API is unavailable → Auto-escalate

**Manual Escalation:**
- Customer clicks "Transfer to CS" button
- Chat status changes to `waiting_cs`
- CS sees the chat in their queue

### Customer Escalates Chat

```
POST /api/escalate
Authorization: Bearer <customer-token>
Content-Type: application/json

{
  "chat_id": "uuid",
  "reason": "Masih belum terjawab" (optional)
}

Response:
{
  "message": "Chat berhasil dialihkan ke customer service.",
  "chat_id": "uuid",
  "status": "waiting_cs"
}
```

### Get Pending Escalations

```
GET /api/escalate/pending
Authorization: Bearer <cs-or-admin-token>

Response:
{
  "pending_chats": [
    {
      "id": "uuid",
      "title": "...",
      "status": "waiting_cs",
      "customer_id": "uuid",
      "profiles": {
        "full_name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "count": 3
}
```

---

## 🎧 Customer Service Endpoints

### Get Assigned Chats

```
GET /api/cs/chats
Authorization: Bearer <cs-token>

Response:
{
  "chats": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "cs_id": "uuid",
      "status": "with_cs",
      "title": "...",
      "profiles": {
        "full_name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "count": 2
}
```

### Get Specific Chat with Messages

```
GET /api/cs/chats/{chatId}
Authorization: Bearer <cs-token>

Response:
{
  "chat": {
    "id": "uuid",
    "customer_id": "uuid",
    "cs_id": "uuid",
    "status": "with_cs"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "...",
      "created_at": "...",
      "profiles": {
        "full_name": "John Doe"
      }
    },
    {
      "id": "uuid",
      "role": "cs",
      "content": "Kami akan membantu...",
      "created_at": "...",
      "profiles": {
        "full_name": "CS Agent Name"
      }
    }
  ]
}
```

**Note:** When CS opens a chat, it's automatically assigned to them and status changes to `with_cs`.

### CS Sends Message to Customer

```
POST /api/cs/chats/{chatId}/message
Authorization: Bearer <cs-token>
Content-Type: application/json

{
  "message": "Terima kasih sudah menghubungi kami. Kami akan membantu..."
}

Response:
{
  "message": "Pesan berhasil dikirim.",
  "data": {
    "id": "uuid",
    "role": "cs",
    "content": "...",
    "created_at": "..."
  }
}
```

### Update Chat Status

```
PATCH /api/cs/chats/{chatId}/status
Authorization: Bearer <cs-token>
Content-Type: application/json

{
  "status": "solved"
}

Valid statuses: "waiting_cs", "with_cs", "solved"

Response:
{
  "message": "Status berhasil diupdate.",
  "chat_id": "uuid",
  "status": "solved"
}
```

---

## 👨‍💼 Admin Management Endpoints

### List All Users

```
GET /api/admin/users?page=1&limit=10
Authorization: Bearer <admin-token>

Response:
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "customer"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

### Create New User (Any Role)

```
POST /api/admin/users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "newcs@epson.com",
  "password": "securepass123",
  "full_name": "New CS Agent",
  "role": "customer_service"
}

Valid roles: "customer", "admin", "customer_service"

Response:
{
  "message": "Pengguna berhasil dibuat.",
  "user": {
    "id": "uuid",
    "email": "newcs@epson.com",
    "full_name": "New CS Agent",
    "role": "customer_service"
  }
}
```

### Update User

```
PATCH /api/admin/users/{userId}
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "full_name": "Updated Name",
  "role": "admin"
}

Response:
{
  "message": "Pengguna berhasil diupdate.",
  "user_id": "uuid"
}
```

### Delete User

```
DELETE /api/admin/users/{userId}
Authorization: Bearer <admin-token>

Response:
{
  "message": "Pengguna berhasil dihapus.",
  "user_id": "uuid"
}
```

### View All Chats (Monitoring)

```
GET /api/admin/chats?status=waiting_cs
Authorization: Bearer <admin-token>

Response:
{
  "chats": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "cs_id": "uuid",
      "status": "waiting_cs",
      "title": "...",
      "created_at": "..."
    }
  ],
  "stats": {
    "total": 25,
    "ai": 15,
    "waiting_cs": 5,
    "with_cs": 3,
    "solved": 2
  }
}
```

### Dashboard Monitoring Data

```
GET /api/admin/monitoring
Authorization: Bearer <admin-token>

Response:
{
  "users": {
    "total": 50,
    "by_role": {
      "customer": 40,
      "customer_service": 8,
      "admin": 2
    }
  },
  "chats": {
    "total": 25,
    "ai": 15,
    "waiting_cs": 5,
    "with_cs": 3,
    "solved": 2
  },
  "messages": {
    "total": 156
  }
}
```

---

## 👨‍💻 Setup Admin Account

The admin account (`admin@epson.com`) needs to be created manually:

### Option 1: Via Backend API (using service role)

```bash
curl -X POST http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer <existing-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@epson.com",
    "password": "admin@Epson2024",
    "full_name": "Admin EPSON",
    "role": "admin"
  }'
```

### Option 2: Via Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to Authentication → Users
3. Create new user:
   - Email: `admin@epson.com`
   - Password: `admin@Epson2024`
4. Go to profiles table
5. Insert new row:
   - id: (use user's UUID)
   - email: `admin@epson.com`
   - full_name: `Admin EPSON`
   - role: `admin`

---

## 🤖 RAG Model Integration

### Expected RAG Response Format

```json
{
  "status": "success",
  "reply": "Jawaban dari RAG model...",
  "tokens_used": 154,
  "needs_escalation": false
}
```

### Escalation Logic

The backend checks for escalation in this order:

1. **Explicit flag:** If `needs_escalation: true` → escalate
2. **Content check:** If reply contains phrases like:
   - "diluar ranah"
   - "di luar ranah"
   - "tidak bisa menjawab"
   - "tidak dapat menjawab"
   - "outside scope"
3. **Error handling:** If RAG API is unavailable → auto-escalate

### Configuration

Update `.env`:
```
RAG_API_URL=http://localhost:5000
RAG_API_ENDPOINT=/api/chat
```

The backend calls: `${RAG_API_URL}${RAG_API_ENDPOINT}`

---

## 📊 Database Schema

### profiles (users)
```
- id (UUID, PK)
- email (TEXT)
- full_name (TEXT)
- role (TEXT: 'customer', 'admin', 'customer_service')
```

### chats
```
- id (UUID, PK)
- customer_id (UUID, FK → profiles)
- cs_id (UUID, FK → profiles, nullable)
- title (TEXT)
- preview (TEXT)
- status (TEXT: 'ai', 'waiting_cs', 'with_cs', 'solved')
- created_at (TIMESTAMP)
```

### messages
```
- id (UUID, PK)
- chat_id (UUID, FK → chats)
- sender_id (UUID, FK → profiles)
- role (TEXT: 'user', 'assistant', 'cs')
- content (TEXT)
- image_url (TEXT, nullable)
- created_at (TIMESTAMP)
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Development mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start
```

---

## 🔧 Troubleshooting

### "Token tidak ditemukan"
- Ensure you're sending `Authorization: Bearer <token>` header
- Token format should be exactly as received from login/register

### "Email atau password salah"
- Check email and password are correct
- Ensure account is created in Supabase

### "Sistem sedang tidak tersedia"
- RAG model is down or unreachable
- Check `RAG_API_URL` in .env
- Ensure RAG service is running

### "Role tidak valid"
- Only 'customer', 'admin', 'customer_service' allowed
- Check spelling in database

### JWT Expired
- Token valid for 7 days
- User needs to login again to get new token
- Can implement refresh token logic if needed

---

## 📝 API Usage Example (cURL)

```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "pass123",
    "full_name": "John Doe"
  }'

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "pass123"
  }' | jq -r '.token')

# 3. Send Chat Message
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Printer saya error"
  }'

# 4. Get Chat History
curl -X GET http://localhost:3001/api/chat/{chatId} \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📞 Support & Questions

For issues or questions:
1. Check logs in console
2. Review Supabase dashboard for data consistency
3. Ensure RAG model is running and accessible
4. Verify JWT token is valid and not expired

Happy coding! 🚀
