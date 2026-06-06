import chromadb
from google import genai
from app.core.config import settings

class VectorStoreService:
    """Manages the local ChromaDB vector store and semantic search."""
    
    def __init__(self):
        # Initialize local vector database in the 'chroma_data' folder
        self.chroma_client = chromadb.PersistentClient(path="./chroma_data")
        
        # Get or create a collection for Epson manuals
        self.collection = self.chroma_client.get_or_create_collection(name="epson_manuals")
        
        # Initialize Gemini Client for embeddings
        self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def get_embedding(self, text: str) -> list[float]:
        """Generates a vector embedding for a given text using Google's embedding model."""
        response = self.gemini_client.models.embed_content(
            model='gemini-embedding-001',
            contents=text,
        )
        return response.embeddings[0].values

    def search_similar_documents(self, query: str, top_k: int = 3) -> str:
        """
        Converts the user query to a vector and retrieves the top_k most relevant document chunks.
        """
        # 1. Convert user query to vector
        query_embedding = self.get_embedding(query)
        
        # 2. Search the ChromaDB collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        # 3. Format the retrieved documents into a single context string
        if not results["documents"] or not results["documents"][0]:
            return "Tidak ada dokumen referensi yang ditemukan."
            
        retrieved_context = "\n\n".join(results["documents"][0])
        return retrieved_context

vector_store = VectorStoreService()