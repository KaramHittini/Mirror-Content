import pytest
import numpy as np
import sys
import os

# Ensure the root directory is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ai.analyzers.image_analyzer import ImageAnalyzer
from ai.engine.benchmark_engine import BenchmarkEngine
from ai.engine.insight_engine import InsightEngine

def test_analyze_sharpness():
    # Empty frame
    assert ImageAnalyzer.analyze_sharpness(None) == "Poor"
    
    # Create a solid black image (0 variance -> Poor)
    black_frame = np.zeros((100, 100, 3), dtype=np.uint8)
    assert ImageAnalyzer.analyze_sharpness(black_frame) == "Poor"
    
    # Create a noisy image (high variance -> Excellent)
    noisy_frame = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
    assert ImageAnalyzer.analyze_sharpness(noisy_frame) == "Excellent"

def test_analyze_brightness():
    # Solid black (mean V = 0)
    black_frame = np.zeros((100, 100, 3), dtype=np.uint8)
    assert ImageAnalyzer.analyze_brightness(black_frame) == "Underexposed"
    
    # Solid white (mean V = 255)
    white_frame = np.ones((100, 100, 3), dtype=np.uint8) * 255
    assert ImageAnalyzer.analyze_brightness(white_frame) == "Overexposed"
    
    # Gray (mean V = 128)
    gray_frame = np.ones((100, 100, 3), dtype=np.uint8) * 128
    assert ImageAnalyzer.analyze_brightness(gray_frame) == "Normal"

def test_analyze_camera_stability():
    frame1 = np.zeros((100, 100, 3), dtype=np.uint8)
    frame2 = np.ones((100, 100, 3), dtype=np.uint8) * 255
    
    # Same frames should yield 0 difference
    assert ImageAnalyzer.analyze_camera_stability(frame1, frame1) == 0.0
    
    # Different frames should yield positive difference
    assert ImageAnalyzer.analyze_camera_stability(frame1, frame2) > 0.0

def test_benchmark_encoding():
    engine = BenchmarkEngine(api_key=None) # Use mock mode
    vector = engine.encode_feature_vector(
        hook_score=85,      # Should be scaled to 0.85
        pacing=90,          # Should be scaled to 0.9
        audio_quality=0.8,  # Kept as 0.8
        image_quality="Excellent", # Maps to 1.0
        face_detected=True,        # Maps to 1.0
        subtitles_detected=False,  # Maps to 0.0
        wpm=150                    # Maps to 150/300 = 0.5
    )
    assert len(vector) == 7
    assert pytest.approx(vector[0]) == 0.85
    assert pytest.approx(vector[1]) == 0.9
    assert pytest.approx(vector[2]) == 0.8
    assert vector[3] == 1.0
    assert vector[4] == 1.0
    assert vector[5] == 0.0
    assert pytest.approx(vector[6]) == 0.5
    
def test_insight_generation():
    visual_data = {
        "face_detected": False,
        "subtitles_detected": False,
        "brightness": "Underexposed",
        "sharpness": "Poor",
        "camera_stability": 60.5
    }
    insights = InsightEngine.generate_insights(visual_data, "No comparison")
    assert len(insights) == 5
    
    severities = [i['severity'] for i in insights]
    assert "Low Severity" in severities    # Face
    assert "Medium Severity" in severities # Subtitles, Stability
    assert "High Severity" in severities   # Brightness, Sharpness
