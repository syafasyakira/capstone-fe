import math
from google import genai
from app.core.config import settings
from supabase import create_client, Client

class VectorStoreService:
    """Manages semantic search using Supabase knowledge_base + Gemini embeddings."""

    def __init__(self):
        self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )

    def get_embedding(self, text: str) -> list[float]:
        """Generates a vector embedding for a given text using Gemini."""
        response = self.gemini_client.models.embed_content(
            model='gemini-embedding-001',
            contents=text,
        )
        return response.embeddings[0].values

    def _cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        """Calculates cosine similarity between two vectors."""
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def search_similar_documents(self, query: str, top_k: int = 3) -> str:
        """
        Fetches all knowledge from Supabase, embeds the query,
        and returns the top_k most relevant FAQ entries.
        """
        # 1. Ambil semua data dari Supabase
        response = self.supabase.table('knowledge_base') \
            .select('pertanyaan, jawaban') \
            .execute()

        items = response.data
        if not items:
            return "Tidak ada dokumen referensi yang ditemukan."

        # 2. Embed query user
        query_embedding = self.get_embedding(query)

        # 3. Hitung similarity tiap item
        scored = []
        for item in items:
            pertanyaan = item.get('pertanyaan', '')
            jawaban = item.get('jawaban', '')
            chunk_text = f"Pertanyaan: {pertanyaan}\nJawaban: {jawaban}"
            item_embedding = self.get_embedding(chunk_text)
            score = self._cosine_similarity(query_embedding, item_embedding)
            scored.append((score, chunk_text))

        # 4. Ambil top_k paling relevan
        scored.sort(key=lambda x: x[0], reverse=True)
        top_results = [text for _, text in scored[:top_k]]

        return "\n\n".join(top_results)

vector_store = VectorStoreService()