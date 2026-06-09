# AI Helpdesk Assistant

> Capstone Project — Smart Helpdesk Chatbot untuk PT Indonesia Epson Industry

## Identitas Proyek

| Field             | Detail                          |
|-------------------|---------------------------------|
| **Judul Capstone** | AI Helpdesk Assistant           |
| **Topik**          | Smart Helpdesk Chatbot          |
| **Mitra / Studi Kasus** | PT Indonesia Epson Industry |
| **Nama Tim Proyek**  | A5 Tim 7                     |

## Anggota Kelompok

| Nama                           | NIM             | Program Studi |
|--------------------------------|-----------------|---------------|
| ZAQIA MAHADEWI                 | 235150201111001 | TIF           |
| SYAFA SYAKIRA SHALSABILLA      | 235150201111006 | TIF           |
| MUHAMMAD RAFLY ASH SHIDDIQI    | 235150207111062 | TIF           |
| FADHLULLAH AKMAL               | 235150207111068 | TIF           |
| HARUN JEYNARO DEWANTORO PUTRA  | 235150400111008 | SI            |
| MUHAMMAD FARREL RADITYA LAKSBIANTORO | 235150401111003 | SI     |
| YEHEZKIEL D.C. SILALAHI        | 235150407111014 | SI            |

---

## Deskripsi Proyek

AI Helpdesk Assistant adalah aplikasi chat helpdesk berbasis AI yang dirancang untuk membantu PT Indonesia Epson Industry dalam menangani pertanyaan pelanggan secara otomatis. Proyek ini menggunakan pendekatan hybrid yang menggabungkan AI chatbot untuk menangani pertanyaan umum, sistem eskalasi ke customer service manusia ketika diperlukan, serta fitur monitoring dan analisis untuk keperluan evaluasi kinerja.

## Tech Stack

### Frontend
- **React** + **TypeScript**
- **Vite** sebagai build tool
- **Tailwind CSS** untuk styling
- **React Router** untuk navigasi

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Supabase** untuk autentikasi & database
- **Gemini API** untuk analisis top issues

### AI / RAG Service
- **Python** (FastAPI)
- **ChromaDB** sebagai vector database
- **Gemini API** untuk pemrosesan bahasa alami

---

## Prasyarat

Sebelum menjalankan proyek, pastikan memiliki:

- **Node.js** v18 atau lebih baru
- **Python** v3.10 atau lebih baru
- **Git**
- **Akun Supabase** (untuk database & autentikasi)
- **API Key Gemini** (untuk fitur AI)

---

## Langkah-Langkah Instalasi & Menjalankan

### 1. Clone Repository

```bash
git clone https://github.com/syafasyakira/capstone-fe.git
cd capstone-fe
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buat database table `profiles` dengan schema berikut:

```sql
create table profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  role text default 'customer',
  created_at timestamptz default now()
);
```

3. Buat table `chats` dan `messages` dengan schema berikut:

```sql
create table chats (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users,
  cs_id uuid references auth.users,
  title text,
  preview text,
  status text default 'ai',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats on delete cascade,
  sender_id uuid references auth.users,
  role text,  -- 'user', 'assistant', 'cs'
  content text,
  image_url text,
  created_at timestamptz default now()
);
```

4. Aktifkan **Row Level Security (RLS)** pada kedua table tersebut dan buat kebijakan akses yang sesuai
5. Copy **Project URL**, **anon/public key**, dan **service_role key** dari Supabase dashboard

### 3. Setup Environment Variables

#### Frontend

```bash
cd frontend
cp .env.example .env   # jika ada file contoh, jika tidak buat manual
```

Edit `frontend/.env`:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

#### Backend

```bash
cd backend
cp .env.example .env   # jika ada file contoh, jika tidak buat manual
```

Edit `backend/.env`:

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-key>
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL_ID=gemini-3-flash-preview
PORT=3001
```

### 4. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplikasi frontend akan berjalan di `http://localhost:5173`

### 5. Install & Run Backend

```bash
cd backend
npm install
npm run dev
```

Backend API akan berjalan di `http://localhost:3001`

### 6. Install & Run RAG Service (AI)

```bash
cd epson-ai-chatbot
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

RAG service akan berjalan di `http://localhost:8000`

---

## Struktur Direktori

```
capstone-fe/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/      # React contexts (auth, chat)
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   └── .env               # Frontend environment variables
├── backend/              # Express.js backend API
│   ├── src/
│   │   ├── config/       # Configuration (supabase, AI)
│   │   ├── middleware/    # Auth middleware
│   │   ├── models/       # Type definitions
│   │   ├── routes/       # API routes (admin, auth, chat, cs, etc.)
│   │   └── utils/        # Utility functions
│   └── .env              # Backend environment variables
└── epson-ai-chatbot/     # Python AI chatbot (ingestion & standalone bot)
    ├── app/
    │   ├── api/          # API endpoints
    │   ├── core/         # Core configuration
    │   ├── schemas/      # Pydantic schemas
    │   └── services/     # Business logic (LLM, vector store)
    └── data/             # FAQ data for ingestion
```

---

## Fitur Utama

### Untuk Customer
- Chat dengan AI chatbot untuk pertanyaan umum
- Eskalasi manual ke CS via tombol "Belum terselesaikan?" jika pertanyaan tidak bisa dijawab AI
- Setelah diklik, customer melihat notifikasi "Percakapan anda sedang diteruskan ke Customer Service kami, mohon tunggu untuk beberapa saat..." dan input chat dinonaktifkan
- Riwayat chat

### Untuk Customer Service
- Dashboard untuk melihat chat yang masuk (menunggu / sedang ditangani / selesai)
- CS mengklik "Ambil" untuk menerima sesi chat — status otomatis berubah dari `waiting_cs` ke `with_cs`
- CS dan customer dapat langsung berkirim pesan setelah terhubung
- CS dapat menandai chat selesai ("Selesai") atau tidak ("Tidak Selesai")
- Setelah chat selesai, AI akan membuatkan ringkasan penanganan

### Untuk Admin
- Kelola akun pengguna (tambah, edit, hapus)
- Default role akun baru via "Tambah Akun" adalah **Customer Service**
- Monitoring statistik chat (total, solved, pending)
- Analisis top issues