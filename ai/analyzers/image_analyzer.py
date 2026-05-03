import cv2
import numpy as np
import logging

try:
    import face_recognition
except ImportError:
    face_recognition = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

logger = logging.getLogger(__name__)

class ImageAnalyzer:
    @staticmethod
    def analyze_sharpness(frame: np.ndarray) -> str:
        """
        Calculates sharpness using Laplacian variance.
        Classifies as Poor, Average, Good, Excellent.
        """
        if frame is None:
            return "Poor"
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if variance < 50:
            return "Poor"
        elif variance < 150:
            return "Average"
        elif variance < 300:
            return "Good"
        else:
            return "Excellent"

    @staticmethod
    def analyze_brightness(frame: np.ndarray) -> str:
        """
        Converts to HSV and extracts 'Value'.
        Detects Underexposed, Overexposed, or Normal.
        """
        if frame is None:
            return "Normal"
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        v_channel = hsv[:, :, 2]
        mean_v = np.mean(v_channel)
        
        if mean_v < 30:
            return "Underexposed"
        elif mean_v > 230:
            return "Overexposed"
        else:
            return "Normal"

    @staticmethod
    def analyze_camera_stability(prev_frame: np.ndarray, curr_frame: np.ndarray) -> float:
        """
        Measures inter-frame consistency using absdiff.
        Returns a float metric representing camera movement or shake.
        Higher value = less stable.
        """
        if prev_frame is None or curr_frame is None:
            return 0.0
            
        gray_prev = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY) if len(prev_frame.shape) == 3 else prev_frame
        gray_curr = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY) if len(curr_frame.shape) == 3 else curr_frame
        
        diff = cv2.absdiff(gray_prev, gray_curr)
        mean_diff = np.mean(diff)
        return float(mean_diff)

    @staticmethod
    def detect_faces(frame: np.ndarray) -> bool:
        """
        Detects faces using face_recognition (HOG-based) or OpenCV Haar Cascade fallback.
        """
        if frame is None:
            return False
            
        if face_recognition is not None:
            try:
                rgb_frame = frame[:, :, ::-1] # BGR to RGB
                locations = face_recognition.face_locations(rgb_frame)
                return len(locations) > 0
            except Exception as e:
                logger.warning(f"face_recognition failed: {e}. Falling back to HAAR.")
                
        # Fallback to Haar Cascades
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)
        if face_cascade.empty():
            logger.error("Failed to load Haar Cascade.")
            return False
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        return len(faces) > 0

    @staticmethod
    def detect_subtitles(frame: np.ndarray) -> bool:
        """
        Crops lower third and attempts to read text via OCR.
        """
        if frame is None or pytesseract is None:
            return False
            
        height, width = frame.shape[:2]
        # Crop lower third
        lower_third = frame[int(height * 2/3):height, 0:width]
        
        # Preprocessing to improve OCR accuracy
        gray = cv2.cvtColor(lower_third, cv2.COLOR_BGR2GRAY)
        # Thresholding
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
        
        try:
            text = pytesseract.image_to_string(thresh, config='--psm 6')
            # If we detect some valid alphanumeric string of decent length, likely subtitle
            alphanumeric_count = sum(c.isalnum() for c in text)
            return alphanumeric_count >= 5
        except Exception as e:
            logger.warning(f"Tesseract OCR failed: {e}")
            return False
