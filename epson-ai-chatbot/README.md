# Epson AI Chatbot API

Prototipe API chatbot layanan pelanggan untuk Epson. Proyek ini dibangun menggunakan FastAPI dan mengintegrasikan model Google Gemini 3 Flash Preview melalui SDK `google-genai`. API ini dirancang agar mudah diintegrasikan dengan frontend website.

---

## Fitur Utama

- Backend berbasis FastAPI dengan dukungan asynchronous.
- Integrasi model Google Gemini 3 Flash Preview.
- Dukungan riwayat percakapan (*chat history*).
- Pelacakan penggunaan token (`tokens_used`) untuk estimasi biaya.

---

## Prasyarat

Sebelum menjalankan aplikasi, pastikan sistem telah memenuhi kebutuhan berikut:

- Python 3.12 atau versi lebih baru.
- API Key dari Google AI Studio.
- Virtual environment (`venv`, `pyenv`, atau `conda`) sangat disarankan.

---

## Instalasi dan Persiapan

### 1. Masuk ke Direktori Proyek

```bash
cd epson-ai-chatbot
```

### 2. Membuat Virtual Environment

Contoh menggunakan Python 3.12.3:

```bash
pyenv local 3.12.3
python -m venv .venv
```

### 3. Mengaktifkan Virtual Environment

#### Windows

```bash
.venv\Scripts\activate
```

#### Linux / macOS

```bash
source .venv/bin/activate
```

### 4. Instalasi Dependensi

```bash
pip install -r requirements.txt
```

---

## Konfigurasi Environment

Buat file `.env` pada root direktori proyek (sejajar dengan `main.py`) lalu tambahkan konfigurasi berikut:

```env
PROJECT_NAME="Epson AI Chatbot API"
VERSION="1.0.0"
GEMINI_API_KEY="masukkan_api_key_gemini_anda_di_sini"
GEMINI_MODEL_ID="gemini-3-flash-preview"
```

Catatan:

- Jangan melakukan commit file `.env` ke repository Git.
- Pastikan API Key tetap bersifat rahasia.

---

## Menjalankan Aplikasi

Jalankan server pengembangan menggunakan Uvicorn:

```bash
uvicorn app.main:app --reload
```

Aplikasi akan berjalan pada alamat berikut:

```text
http://localhost:8000
```

Dokumentasi interaktif Swagger UI dapat diakses melalui:

```text
http://localhost:8000/docs
```

---

## Penggunaan API

### Endpoint

```http
POST /epson/v1/ai-chatbot
```

### Contoh Request

```json
{
  "user_id": "1",
  "message": "Printer saya mengalami kerusakan, di mana hasil printing tersendat-sendat. Kira-kira apa penyebabnya?",
  "history": []
}
```

### Contoh Response

```json
{
  "status": "success",
  "reply": "Halo! Saya asisten AI Epson. Hasil cetakan yang tersendat biasanya disebabkan oleh nozzle head yang tersumbat atau level tinta rendah. Silakan jalankan fitur Nozzle Check dan Head Cleaning pada pengaturan printer Anda.",
  "tokens_used": 154
}
```

---

## Struktur Proyek

```text
epson-chatbot-api/
├── app/
│   ├── main.py
│   ├── api/
│   │   └── v1/
│   │       └── chatbot.py
│   ├── core/
│   │   └── config.py
│   ├── schemas/
│   │   └── chat.py
│   └── services/
│       └── llm_service.py
├── .env
├── .gitignore
└── requirements.txt
```

### Keterangan Struktur

| Path | Deskripsi |
|---|---|
| `app/main.py` | Entry point aplikasi FastAPI |
| `app/api/v1/chatbot.py` | Definisi endpoint API chatbot |
| `app/core/config.py` | Konfigurasi environment dan aplikasi |
| `app/schemas/chat.py` | Schema validasi request dan response |
| `app/services/llm_service.py` | Integrasi layanan Google Gemini |
| `.env` | Variabel environment aplikasi |
| `requirements.txt` | Daftar dependensi Python |
| `.gitignore` | Daftar file yang diabaikan Git |

---

## Teknologi yang Digunakan

- FastAPI
- Uvicorn
- Pydantic
- Google Gemini API (`google-genai`)
- Python 3.12