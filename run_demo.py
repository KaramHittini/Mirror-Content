import sys
import numpy as np
from ai.analyzers.image_analyzer import ImageAnalyzer
from ai.engine.benchmark_engine import BenchmarkEngine
from ai.engine.insight_engine import InsightEngine

def main():
    print("=== Content Mirror: Visual Analysis Pipeline Demo ===\n")
    
    # 1. Generate a mock video frame (a basic gray image)
    print("[*] Generating sample video frame...")
    # 1080p gray frame base
    mock_frame = np.ones((1080, 1920, 3), dtype=np.uint8) * 128 
    # Add some noise to simulate details Instead of a perfectly flat color, which affects sharpness
    noise = np.random.randint(-20, 20, mock_frame.shape, dtype=np.int16)
    mock_frame = (mock_frame + noise).clip(0, 255).astype(np.uint8)

    # 2. Run Image Analysis
    print("\n[*] Running ImageAnalyzer metrics...")
    sharpness = ImageAnalyzer.analyze_sharpness(mock_frame)
    brightness = ImageAnalyzer.analyze_brightness(mock_frame)
    camera_stability = ImageAnalyzer.analyze_camera_stability(mock_frame, mock_frame) # No movement
    faces_detected = ImageAnalyzer.detect_faces(mock_frame)
    subtitles_detected = ImageAnalyzer.detect_subtitles(mock_frame)
    
    print(f"  - Sharpness: {sharpness}")
    print(f"  - Brightness: {brightness}")
    print(f"  - Camera Stability: {camera_stability}")
    print(f"  - Faces Detected: {faces_detected}")
    print(f"  - Subtitles Detected: {subtitles_detected}")
    
    visual_data = {
        "sharpness": sharpness,
        "brightness": brightness,
        "camera_stability": camera_stability,
        "face_detected": faces_detected,
        "subtitles_detected": subtitles_detected
    }

    # 3. Benchmark Engine
    print("\n[*] Initializing BenchmarkEngine...")
    engine = BenchmarkEngine() # Uses mock mode without API Key
    
    vector = engine.encode_feature_vector(
        hook_score=85.0,
        pacing=90.0,
        audio_quality=80.0,
        image_quality=sharpness,
        face_detected=faces_detected,
        subtitles_detected=subtitles_detected,
        wpm=140.0
    )
    print(f"  - Generated Vector: {[round(v, 2) for v in vector]}")
    
    print("\n[*] Querying Pinecone (Mocking)...")
    benchmarks = engine._query_pinecone(vector)
    comparison = engine.generate_comparison(visual_data, benchmarks)
    print(f"  - Comparison String:\n{comparison}")

    # 4. Generate Insights
    print("\n[*] Generating Insights...")
    insights = InsightEngine.generate_insights(visual_data, comparison)
    
    for idx, insight in enumerate(insights, 1):
        print(f"\n  Insight #{idx} [{insight['severity']}] - {insight['category']}")
        print(f"  > {insight['message']}")
        
    print("\n=== Demo Complete ===")

if __name__ == "__main__":
    main()
