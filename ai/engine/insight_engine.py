from typing import List, Dict, Any

class InsightEngine:
    @staticmethod
    def generate_insights(visual_data: Dict[str, Any], comparison_data: str) -> List[Dict[str, str]]:
        """
        Maps visual metrics to human-readable insights with severity ratings.
        """
        insights = []
        
        # Face Detection Insight
        has_faces = visual_data.get("face_detected", False)
        if not has_faces:
            insights.append({
                "severity": "Low Severity",
                "category": "Engagement",
                "message": "No human faces detected. Adding a human presence often builds stronger viewer connection and trust."
            })
            
        # Subtitle Insight
        has_subtitles = visual_data.get("subtitles_detected", False)
        if not has_subtitles:
            insights.append({
                "severity": "Medium Severity",
                "category": "Retention",
                "message": "Subtitles were not detected in the lower third. Many viewers watch on silent; adding clear captions can significantly improve retention."
            })
            
        # Brightness Insight
        brightness = visual_data.get("brightness", "Normal")
        if brightness == "Underexposed":
            insights.append({
                "severity": "High Severity",
                "category": "Visual Quality",
                "message": "Video appears severely underexposed (too dark). This can drive users to scroll past due to poor visibility."
            })
        elif brightness == "Overexposed":
            insights.append({
                "severity": "High Severity",
                "category": "Visual Quality",
                "message": "Video appears overexposed (too bright/washed out). Consider adjusting your lighting to retain detail."
            })
            
        # Sharpness Insight
        sharpness = visual_data.get("sharpness", "Good")
        if sharpness in ["Poor", "Average"]:
            insights.append({
                "severity": "High Severity",
                "category": "Visual Quality",
                "message": f"Image sharpness is evaluated as '{sharpness}'. Ensure your camera is properly focused and you export at an optimal bitrate."
            })

        # Camera Stability Insight
        stability = visual_data.get("camera_stability", 0)
        if stability > 50: # Threshold for noticeable shake
            insights.append({
                "severity": "Medium Severity",
                "category": "Production",
                "message": "Excessive camera shake detected. Consider using a tripod or stabilization software unless the shaking is stylistic."
            })
            
        return insights
