# import requests
# from bs4 import BeautifulSoup
# import chromadb
# from google import genai
# from google.genai import types
# from app.core.config import settings
# import uuid
# import time

# class EpsonDataIngestionPipeline:
#     """
#     Pipeline for scraping, translating, chunking, and ingesting 
#     multilingual Epson support data into a ChromaDB vector store.
#     """
    
#     def __init__(self):
#         # Initialize Vector Database
#         self.chroma_client = chromadb.PersistentClient(path="./chroma_data")
#         self.collection = self.chroma_client.get_or_create_collection(name="epson_manuals")
        
#         # Initialize Gemini SDK
#         self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
#         self.translation_model = settings.GEMINI_MODEL_ID # gemini-2.5-flash

#     def scrape_website_text(self, url: str) -> str:
#         """Scrapes raw text from standard HTML web pages."""
#         try:
#             headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
#             response = requests.get(url, headers=headers, timeout=15)
#             response.raise_for_status()

#             soup = BeautifulSoup(response.content, 'html.parser')
#             content_tags = soup.find_all(['p', 'h1', 'h2', 'h3', 'li'])
            
#             extracted_text = " ".join([tag.get_text(strip=True) for tag in content_tags])
#             return extracted_text
            
#         except Exception as e:
#             print(f"[-] Failed to scrape {url}: {e}")
#             return ""

#     def translate_to_indonesian(self, text: str) -> str:
#         """
#         Uses Gemini to dynamically translate scraped text into professional Indonesian.
#         Includes a retry mechanism for API rate limits and server overloads (503/429).
#         """
#         if not text or len(text.strip()) < 10:
#             return ""
            
#         print("[*] Translating content to Indonesian...")
        
#         translation_prompt = (
#             "You are an expert technical translator. Translate the following text into "
#             "professional and clear Indonesian. Maintain all technical terms related to "
#             "printers, hardware, and IT networking in their standard industry format. "
#             "Return ONLY the translated text without any conversational filler."
#         )

#         max_retries = 5
#         for attempt in range(max_retries):
#             try:
#                 response = self.gemini_client.models.generate_content(
#                     model=self.translation_model,
#                     contents=[
#                         types.Content(
#                             role="user", 
#                             parts=[types.Part.from_text(text=f"{translation_prompt}\n\nText to translate:\n{text}")]
#                         )
#                     ]
#                 )
#                 return response.text
                
#             except Exception as e:
#                 error_msg = str(e)
#                 # Jika error 503 (Unavailable) atau 429 (Too Many Requests)
#                 if "503" in error_msg or "429" in error_msg:
#                     wait_time = 5 * (attempt + 1) # Jeda waktu bertambah (5s, 10s, 15s)
#                     print(f"[-] API busy (Error 503/429). Retrying in {wait_time} seconds... (Attempt {attempt + 1}/{max_retries})")
#                     time.sleep(wait_time)
#                 else:
#                     # Jika error selain itu, langsung lewati
#                     print(f"[-] Translation failed with unexpected error: {e}")
#                     return text
                    
#         print("[-] Max retries reached. Falling back to original English text.")
#         return text

#     def chunk_text(self, text: str, chunk_size: int = 800) -> list[str]:
#         """Splits the translated text into manageable chunks for vectorization."""
#         words = text.split()
#         chunks, current_chunk = [], []
#         current_length = 0
        
#         for word in words:
#             current_length += len(word) + 1
#             if current_length > chunk_size:
#                 chunks.append(" ".join(current_chunk))
#                 current_chunk = [word]
#                 current_length = len(word) + 1
#             else:
#                 current_chunk.append(word)
                
#         if current_chunk:
#             chunks.append(" ".join(current_chunk))
            
#         return chunks

#     def process_and_ingest(self, urls: list[str]):
#         """Executes the complete ETL pipeline."""
#         for url in urls:
#             print(f"\n[+] Processing URL: {url}")
            
#             # 1. Scrape
#             raw_text = self.scrape_website_text(url)
#             if not raw_text:
#                 continue
                
#             # 2. Translate to Indonesian
#             translated_text = self.translate_to_indonesian(raw_text)
                
#             # 3. Chunk
#             text_chunks = self.chunk_text(translated_text)
#             print(f"[+] Created {len(text_chunks)} translated chunks.")
            
#             # 4. Embed & Store
#             for i, chunk in enumerate(text_chunks):
#                 if len(chunk.strip()) < 50: 
#                     continue 
                
#                 try:
#                     response = self.gemini_client.models.embed_content(
#                         model='gemini-embedding-001',
#                         contents=chunk,
#                     )
#                     embedding_vector = response.embeddings[0].values
#                     doc_id = str(uuid.uuid4())
                    
#                     self.collection.add(
#                         ids=[doc_id],
#                         embeddings=[embedding_vector],
#                         documents=[chunk],
#                         metadatas=[{"source": url, "chunk_index": i}]
#                     )
#                 except Exception as e:
#                     print(f"[-] Failed to embed chunk {i}: {e}")
                
#         print("\n[✓] Data ingestion complete. Vector store is ready for RAG.")

# if __name__ == "__main__":
#     target_urls = [
#         "https://www.epson.com.cn/faq/60c711c2176e4320b9292dda6e1ceef8.html",
#         "https://www.epson.com.cn/faq/64265076a12d4cf79d7f8094a960f491.html",
#         "https://www.epson.com.cn/faq/db3820761ba94160878cff7fc6706f84.html",
#     ]
    
#     pipeline = EpsonDataIngestionPipeline()
#     pipeline.process_and_ingest(target_urls)


import csv
import chromadb
from google import genai
from app.core.config import settings
import uuid
import os

class EpsonDataIngestionPipeline:
    """
    Pipeline for reading Epson FAQ data from a local CSV file,
    generating embeddings, and ingesting them into ChromaDB.
    """
    
    def __init__(self):
        # Initialize Vector Database
        self.chroma_client = chromadb.PersistentClient(path="./chroma_data")
        self.collection = self.chroma_client.get_or_create_collection(name="epson_manuals")
        
        # Initialize Gemini SDK for embeddings
        self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def process_csv_and_ingest(self, csv_filepath: str):
        """Executes the ETL pipeline for local CSV data."""
        print(f"\n[+] Memulai proses Ingestion dari file: {csv_filepath}")
        
        if not os.path.exists(csv_filepath):
            print(f"[-] ERROR: File {csv_filepath} tidak ditemukan!")
            print("    Pastikan Anda sudah membuat folder 'data' dan meletakkan file CSV di dalamnya.")
            return

        try:
            with open(csv_filepath, mode='r', encoding='utf-8') as file:
                # Menggunakan DictReader untuk membaca berdasarkan nama kolom (header)
                csv_reader = csv.DictReader(file)
                
                success_count = 0
                for i, row in enumerate(csv_reader):
                    question = row.get("pertanyaan", "").strip()
                    answer = row.get("jawaban", "").strip()
                    
                    if not question or not answer:
                        continue # Lewati baris yang kosong
                        
                    # Gabungkan Pertanyaan dan Jawaban menjadi satu kesatuan teks (Chunk)
                    chunk_text = f"Pertanyaan: {question}\nJawaban: {answer}"
                    
                    print(f"[*] Melakukan embedding FAQ ke-{i+1}...")
                    
                    try:
                        # Buat Vektor (Embedding)
                        response = self.gemini_client.models.embed_content(
                            model='gemini-embedding-001',
                            contents=chunk_text,
                        )
                        embedding_vector = response.embeddings[0].values
                        doc_id = str(uuid.uuid4())
                        
                        # Simpan ke ChromaDB
                        self.collection.add(
                            ids=[doc_id],
                            embeddings=[embedding_vector],
                            documents=[chunk_text],
                            metadatas=[{"source": "dummy_csv", "tipe": "faq", "baris": i+1}]
                        )
                        success_count += 1
                        
                    except Exception as e:
                        print(f"[-] Gagal memproses FAQ ke-{i+1}: {e}")
                        
            print(f"\n[✓] Ingestion Selesai! Berhasil memasukkan {success_count} FAQ ke dalam Vector Database.")
            
        except Exception as e:
            print(f"[-] Terjadi kesalahan saat membaca CSV: {e}")

if __name__ == "__main__":
    # Path menuju file CSV Anda
    csv_path = "data/faq_dummy_data.csv"
    
    pipeline = EpsonDataIngestionPipeline()
    pipeline.process_csv_and_ingest(csv_path)