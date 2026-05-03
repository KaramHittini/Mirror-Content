"""
Pytest configuration for ai/tests/.

Sets up sys.path so both the ai/ package root and the backend/ package root
are importable. This is needed because insight_engine.py imports
`from app.core.config import settings` (a backend module) at module level.
"""

import sys
import os

# ai/ root — so `from engine.x import y` works
AI_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if AI_ROOT not in sys.path:
    sys.path.insert(0, AI_ROOT)

# backend/ root — so `from app.core.config import settings` works
BACKEND_ROOT = os.path.abspath(os.path.join(AI_ROOT, "..", "backend"))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)
