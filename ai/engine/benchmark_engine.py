import os
import logging
from typing import List, Dict, Any

try:
    from pinecone import Pinecone
except ImportError:
    Pinecone = None

logger = logging.getLogger(__name__)

class BenchmarkEngine:
    def __init__(self, api_key: str = None, environment: str = None, index_name: str = None):
        """
        Initialize the BenchmarkEngine with Pinecone parameters.
        Falls back to environment variables if parameters are not provided.
        """
        self.api_key = api_key or os.getenv("PINECONE_API_KEY")
        self.environment = environment or os.getenv("PINECONE_ENV", "us-east-1")
        self.index_name = index_name or os.getenv("PINECONE_INDEX_NAME", "content-benchmarks")
        self.pc = None
        self.index = None
        
        if self.api_key and Pinecone is not None:
            try:
                self.pc = Pinecone(api_key=self.api_key)
                self.index = self.pc.Index(self.index_name)
            except Exception as e:
                logger.error(f"Failed to initialize Pinecone: {e}")
        else:
            logger.warning("Pinecone API key missing or pinecone-client not installed. Engine will run in fallback/mock mode.")

    def encode_feature_vector(self, 
                              hook_score: float, 
                              pacing: float, 
                              audio_quality: float, 
                              image_quality: str, 
                              face_detected: bool, 
                              subtitles_detected: bool, 
                              wpm: float) -> List[float]:
        """
        Transforms raw metrics into a 7-D normalized vector.
        Vector schema: [hook_score, pacing, audio_quality, image_quality_score, face_detected_score, subtitles_detected_score, wpm_score]
        """
        # Normalize/map image quality
        quality_map = {"Poor": 0.0, "Average": 0.33, "Good": 0.66, "Excellent": 1.0}
        iq_score = quality_map.get(image_quality, 0.5)
        
        # Booleans to float
        face_score = 1.0 if face_detected else 0.0
        sub_score = 1.0 if subtitles_detected else 0.0
        
        # Normalize WPM (assuming 150 is average, max 300)
        wpm_score = min(wpm / 300.0, 1.0)
        
        vector = [
            min(hook_score / 100.0 if hook_score > 1 else hook_score, 1.0),
            min(pacing / 100.0 if pacing > 1 else pacing, 1.0),
            min(audio_quality / 100.0 if audio_quality > 1 else audio_quality, 1.0),
            iq_score,
            face_score,
            sub_score,
            wpm_score
        ]
        return [float(x) for x in vector]

    def _query_pinecone(self, vector: List[float], top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Queries Pinecone against historical successful benchmarks.
        """
        if not self.index:
            logger.warning("Pinecone index unavailable, returning mock benchmark data.")
            # Mock data for robustness
            return [
                {"id": "mock_vid_1", "score": 0.95, "metadata": {"hook_score": 0.9, "face_detected": True, "subtitles_detected": True}},
                {"id": "mock_vid_2", "score": 0.88, "metadata": {"hook_score": 0.8, "face_detected": True, "subtitles_detected": False}},
            ]
            
        try:
            results = self.index.query(
                vector=vector,
                top_k=top_k,
                include_metadata=True
            )
            return results.get('matches', [])
        except Exception as e:
            logger.error(f"Pinecone query failed: {e}")
            return []

    def generate_comparison(self, user_metrics: dict, benchmarks: List[Dict[str, Any]]) -> str:
        """
        Generates a comparison string summarizing differences between user and top benchmarks.
        """
        if not benchmarks:
            return "No successful benchmark data available to compare against at this time."
            
        top_benchmark = benchmarks[0]
        bm_meta = top_benchmark.get("metadata", {})
        
        differences = []
        user_hook = user_metrics.get("hook_score", 0)
        bm_hook = bm_meta.get("hook_score", 0)
        
        if (user_hook < 1.0 and bm_hook <= 1.0) and user_hook < bm_hook - 0.15:
            differences.append(f"Your hook score is notably lower than the top benchmark ({user_hook:.2f} vs {bm_hook:.2f}).")
            
        user_face = user_metrics.get("face_detected", False)
        bm_face = bm_meta.get("face_detected", True)
        if bm_face and not user_face:
            differences.append("Top benchmark features human faces, while yours does not.")
            
        user_sub = user_metrics.get("subtitles_detected", False)
        bm_sub = bm_meta.get("subtitles_detected", True)
        if bm_sub and not user_sub:
            differences.append("Top benchmark utilizes subtitles to improve accessibility and retention, which are missing from yours.")
            
        if not differences:
            return "Your metrics closely align with top-performing content in the database!"
            
        return "Key Differences:\n- " + "\n- ".join(differences)
