import math
import time
from google import genai
from app.core.config import settings
from supabase import create_client, Client

# Cache TTL: refresh embeddings setiap 5 menit
CACHE_TTL_SECONDS = 300

class VectorStoreService:
    """Semantic search using Supabase knowledge_base + Gemini embeddings with in-memory cache."""

    def __init__(self):
        self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        # Cache: list of {"text": str, "embedding": list[float]}
        self._cache: list[dict] = []
        self._cache_loaded_at: float = 0.0

    def get_embedding(self, text: str) -> list[float]:
        response = self.gemini_client.models.embed_content(
            model='gemini-embedding-001',
            contents=text,
        )
        return response.embeddings[0].values

    def _cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def _load_cache(self):
        """Fetch all FAQ from Supabase and pre-compute embeddings. Runs once then cached."""
        print("[VectorStore] Loading knowledge base from Supabase...")
        response = self.supabase.table('knowledge_base') \
            .select('pertanyaan, jawaban') \
            .execute()

        items = response.data or []
        cache = []
        for item in items:
            pertanyaan = item.get('pertanyaan', '')
            jawaban = item.get('jawaban', '')
            chunk_text = f"Pertanyaan: {pertanyaan}\nJawaban: {jawaban}"
            try:
                embedding = self.get_embedding(chunk_text)
                cache.append({"text": chunk_text, "embedding": embedding})
            except Exception as e:
                print(f"[VectorStore] Failed to embed item: {e}")

        self._cache = cache
        self._cache_loaded_at = time.time()
        print(f"[VectorStore] Cache loaded: {len(cache)} items.")

    def _ensure_cache(self):
        """Refresh cache if empty or TTL expired."""
        age = time.time() - self._cache_loaded_at
        if not self._cache or age > CACHE_TTL_SECONDS:
            self._load_cache()

    def search_similar_documents(self, query: str, top_k: int = 3) -> str:
        """Embed query and find top_k most similar FAQ from cache."""
        self._ensure_cache()

        if not self._cache:
            return "Tidak ada dokumen referensi yang ditemukan."

        # Embed query (1 API call saja)
        query_embedding = self.get_embedding(query)

        # Hitung similarity ke semua cached items (pure Python, cepat)
        scored = [
            (self._cosine_similarity(query_embedding, item["embedding"]), item["text"])
            for item in self._cache
        ]
        scored.sort(key=lambda x: x[0], reverse=True)

        return "\n\n".join(text for _, text in scored[:top_k])

vector_store = VectorStoreService()