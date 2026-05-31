"""
VISUAR - Vision Module
Main class for face detection, distance estimation, and eye state detection.
Uses MediaPipe Tasks API (IMAGE mode) — one sync detect per WebSocket frame.
"""

from __future__ import annotations

import cv2
import numpy as np
import os
from typing import Optional, Dict, Any, List

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# Changed to relative import so uvicorn doesn't crash when running main.py
from .calibrator import DistanceCalibrator


mp_hands = mp.solutions.hands


# ──────────────────────────────────────────────
# Landmark indices
# ──────────────────────────────────────────────
FACE_WIDTH_LEFT  = 234   # left cheek landmark
FACE_WIDTH_RIGHT = 454   # right cheek landmark

# Eye landmarks (MediaPipe 478-point mesh)
LEFT_EYE_INDICES  = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

EAR_THRESHOLD = 0.17


def _to_json_safe(value: Any) -> Any:
    """Convert numpy scalars to native Python types for JSON/WebSocket."""
    if isinstance(value, dict):
        return {k: _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_json_safe(v) for v in value]
    if isinstance(value, np.bool_):
        return bool(value)
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return float(value)
    return value


def _ear(landmarks, indices, img_w: int, img_h: int) -> float:
    """Compute Eye Aspect Ratio for a set of 6 landmark indices."""
    pts = []
    for i in indices:
        lm = landmarks[i]
        pts.append(np.array([lm.x * img_w, lm.y * img_h]))

    # |P2-P6|
    A = np.linalg.norm(pts[1] - pts[5])
    # |P3-P5|
    B = np.linalg.norm(pts[2] - pts[4])
    # |P1-P4|
    C = np.linalg.norm(pts[0] - pts[3])

    if C < 1e-6:
        return 0.0
    return (A + B) / (2.0 * C)


class VisionModule:
    """
    Per-frame face analysis for VISUAR (sync detect matches WebSocket request/response).

    Usage
    -----
    vm = VisionModule()
    vm.start()
    result = vm.process_frame(bgr_frame)
    vm.stop()
    """

    MODEL_PATH = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "face_landmarker.task")
    )

    def __init__(self):
        self._landmarker: "Optional[mp_vision.FaceLandmarker]" = None
        
        # Hand detector
        self._hands = mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        
        self._calibrator = DistanceCalibrator()

        # Distance smoothing (EMA)
        self._smoothed_distance: Optional[float] = None
        self._ema_alpha = 0.45  # lower = smoother, higher = more responsive

        self._running = False
        print("[VisionModule] Initialized (model not yet loaded).")

    # ──────────────────────────────────────────
    # Lifecycle
    # ──────────────────────────────────────────

    def start(self) -> None:
        """Lazy-load the MediaPipe model and start processing."""
        self._load_model()
        self._running = True
        print("[VisionModule] Started.")

    def stop(self) -> None:
        self._running = False
        if self._landmarker:
            self._landmarker.close()
        print("[VisionModule] Stopped.")

    # ──────────────────────────────────────────
    # Model loading
    # ──────────────────────────────────────────

    def _load_model(self) -> None:
        if not os.path.isfile(self.MODEL_PATH):
            raise FileNotFoundError(
                f"[VisionModule] Model file not found: {self.MODEL_PATH}\n"
                "Download from: https://storage.googleapis.com/mediapipe-models/"
                "face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
            )

        print(f"[VisionModule] Loading model from: {self.MODEL_PATH}")
        with open(self.MODEL_PATH, "rb") as f:
            model_bytes = f.read()

        # On some Windows setups, model_asset_path can be incorrectly treated as
        # a relative path inside site-packages. Passing bytes avoids that issue.
        base_opts = mp_python.BaseOptions(model_asset_buffer=model_bytes)
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_opts,
            running_mode=mp_vision.RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        self._landmarker = mp_vision.FaceLandmarker.create_from_options(options)
        print("[VisionModule] Model loaded successfully (IMAGE / sync).")
        
    def _get_eye_regions(self, landmarks, w, h):
        # Approx bounding boxes for eyes
        left_pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in LEFT_EYE_INDICES]
        right_pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in RIGHT_EYE_INDICES]
    
        def bbox(pts):
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            x1, y1, x2, y2 = int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))
            # Expand the eye ROI so hand overlap is easier to detect.
            eye_w = max(1, x2 - x1)
            eye_h = max(1, y2 - y1)
            pad_x = int(eye_w * 0.35) + 2
            pad_y = int(eye_h * 0.6) + 2
            return x1 - pad_x, y1 - pad_y, x2 + pad_x, y2 + pad_y
    
        return bbox(left_pts), bbox(right_pts)
    
    def _detect_hand_boxes(self, frame):
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        hand_result = self._hands.process(rgb)

        boxes = []
        if not hand_result.multi_hand_landmarks:
            return boxes

        for hand_landmarks in hand_result.multi_hand_landmarks:
            xs = [lm.x * w for lm in hand_landmarks.landmark]
            ys = [lm.y * h for lm in hand_landmarks.landmark]
            x1, y1, x2, y2 = int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))

            # Slightly inflate box to capture partial eye covering.
            hand_w = max(1, x2 - x1)
            hand_h = max(1, y2 - y1)
            pad_x = int(hand_w * 0.12) + 2
            pad_y = int(hand_h * 0.12) + 2
            boxes.append((x1 - pad_x, y1 - pad_y, x2 + pad_x, y2 + pad_y))

        return boxes

    @staticmethod
    def _eye_box_overlapped(eye_box, other_box, min_eye_overlap: float = 0.25) -> bool:
        ex1, ey1, ex2, ey2 = eye_box
        ox1, oy1, ox2, oy2 = other_box

        ix1 = max(ex1, ox1)
        iy1 = max(ey1, oy1)
        ix2 = min(ex2, ox2)
        iy2 = min(ey2, oy2)

        if ix2 <= ix1 or iy2 <= iy1:
            return False

        inter_area = float((ix2 - ix1) * (iy2 - iy1))
        eye_area = float(max(1, (ex2 - ex1) * (ey2 - ey1)))
        return (inter_area / eye_area) >= min_eye_overlap

    def _is_eye_occluded(self, frame, eye_box, hand_boxes=None):
        x1, y1, x2, y2 = eye_box
    
        h, w = frame.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
    
        if x2 <= x1 or y2 <= y1:
            return False

        # Only use hand-box overlap — the texture variance fallback
        # causes too many false positives/negatives with webcam streams.
        if hand_boxes:
            eye_box_clamped = (x1, y1, x2, y2)
            if any(self._eye_box_overlapped(eye_box_clamped, hb, min_eye_overlap=0.15) for hb in hand_boxes):
                return True

        return False

    # ──────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────

    def _detect_landmarks(self, bgr_frame: np.ndarray) -> Optional[List]:
        """Run sync face detection on this frame (same frame WebSocket sent)."""
        if self._landmarker is None:
            return None
        try:
            rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = self._landmarker.detect(mp_image)
            if result.face_landmarks:
                return result.face_landmarks[0]
        except Exception as exc:
            print(f"[VisionModule] detect error: {exc}")
        return None

    def process_frame(self, bgr_frame: np.ndarray) -> Dict[str, Any]:
        """
        Detect face on the submitted frame and return distance / eye state.

        Returns
        -------
        dict with keys:
            face_detected   : bool
            distance_cm     : float | None
            distance_status : "too_close" | "ok" | "too_far"
            eye_state       : "both_open" | "both_closed" |
                              "left_covered" | "right_covered"
        """
        if not self._running or self._landmarker is None:
            return self._empty_result()

        landmarks = self._detect_landmarks(bgr_frame)
        if landmarks is None:
            return self._empty_result()

        return self._build_output(bgr_frame, landmarks)

    def calibrate(self, bgr_frame: np.ndarray, known_distance_cm: float = 50.0) -> bool:
        """Calibrate focal length from face width at a known distance."""
        landmarks = self._detect_landmarks(bgr_frame)
        if landmarks is None:
            return False

        h, w = bgr_frame.shape[:2]
        face_w_px = self._face_width_px(landmarks, w, h)
        if face_w_px is None:
            return False

        self._calibrator.calibrate(face_w_px, known_distance_cm)
        return True

    # ──────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────

    def _build_output(self, bgr_frame: np.ndarray, landmarks) -> Dict[str, Any]:
        h, w = bgr_frame.shape[:2]

        # ── Distance (with EMA smoothing) ────
        face_w_px = self._face_width_px(landmarks, w, h)
        if face_w_px is not None:
            raw_distance = self._calibrator.estimate(face_w_px)
            if self._smoothed_distance is None:
                self._smoothed_distance = raw_distance
            else:
                self._smoothed_distance = (
                    self._ema_alpha * raw_distance
                    + (1 - self._ema_alpha) * self._smoothed_distance
                )
            distance_cm = self._smoothed_distance
            distance_status = self._classify_distance(distance_cm)
        else:
            distance_cm = None
            distance_status = "too_far"

        # ── Eye state ─────────────────────────
        left_ear  = _ear(landmarks, LEFT_EYE_INDICES,  w, h)
        right_ear = _ear(landmarks, RIGHT_EYE_INDICES, w, h)
        # Eye regions
        left_box, right_box = self._get_eye_regions(landmarks, w, h)
        glasses_detected, sunglasses_detected = self._detect_eyewear(
            bgr_frame, left_box, right_box
        )
        both_eyes_visible = left_ear > EAR_THRESHOLD and right_ear > EAR_THRESHOLD
        hand_boxes = self._detect_hand_boxes(bgr_frame)
        
        left_occ  = self._is_eye_occluded(bgr_frame, left_box, hand_boxes)
        right_occ = self._is_eye_occluded(bgr_frame, right_box, hand_boxes)
        
        # PRIORITY: real occlusion
        if left_occ and right_occ:
            eye_state = "both_covered"
        elif left_occ:
            eye_state = "left_covered"
        elif right_occ:
            eye_state = "right_covered"
        else:
            eye_state = self._classify_eye(left_ear, right_ear)

        return _to_json_safe({
            "face_detected":       True,
            "distance_cm":         round(float(distance_cm), 1) if distance_cm is not None else None,
            "distance_status":     distance_status,
            "eye_state":           eye_state,
            "glasses_detected":    bool(glasses_detected),
            "sunglasses_detected": bool(sunglasses_detected),
            "both_eyes_visible":   bool(both_eyes_visible),
        })

    @staticmethod
    def _face_width_px(
        landmarks, img_w: int, img_h: int
    ) -> Optional[float]:
        try:
            lx = landmarks[FACE_WIDTH_LEFT].x  * img_w
            rx = landmarks[FACE_WIDTH_RIGHT].x * img_w
            return abs(rx - lx)
        except (IndexError, AttributeError):
            return None

    @staticmethod
    def _classify_distance(d: float) -> str:
        if d < 35:
            return "too_close"
        if d <= 90:
            return "ok"
        return "too_far"

    @staticmethod
    def _classify_eye(left_ear: float, right_ear: float) -> str:
        # Strong thresholds
        CLOSED = 0.20
        COVERED = 0.05   # much lower → likely occlusion
    
        left_closed  = left_ear  < CLOSED
        right_closed = right_ear < CLOSED
    
        left_covered  = left_ear  < COVERED
        right_covered = right_ear < COVERED
    
        # ── COVERED detection (priority) ──
        if left_covered and right_covered:
            return "both_covered"
    
        if left_covered:
            return "left_covered"
    
        if right_covered:
            return "right_covered"
    
        # ── Normal blink logic ──
        if left_closed and right_closed:
            return "both_closed"
    
        if left_ear > 0.16 and right_ear > 0.16:
            return "both_open"
    
        # asymmetric blink (rare but possible)
        if left_closed:
            return "left_closed"
    
        return "right_closed"

    def _detect_eyewear(
        self, frame: np.ndarray, left_box, right_box
    ) -> tuple[bool, bool]:
        """
        Heuristic eyewear detection — not fully reliable; UI allows manual override.
        """
        h, w = frame.shape[:2]
        glasses_scores = []
        sunglass_scores = []

        for box in (left_box, right_box):
            x1, y1, x2, y2 = box
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            if x2 <= x1 or y2 <= y1:
                continue
            roi = frame[y1:y2, x1:x2]
            if roi.size == 0:
                continue
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            edge_density = float(np.count_nonzero(edges)) / max(1, edges.size)
            mean_bright = float(np.mean(gray))
            glasses_scores.append(edge_density > 0.12)
            sunglass_scores.append(mean_bright < 45)

        glasses = sum(glasses_scores) >= 1 if glasses_scores else False
        sunglasses = sum(sunglass_scores) >= 2 if sunglass_scores else False
        return glasses, sunglasses

    def _empty_result(self) -> Dict[str, Any]:
        """No face in frame — keep last distance so UI can still show movement."""
        last_cm = (
            round(float(self._smoothed_distance), 1)
            if self._smoothed_distance is not None
            else None
        )
        status = (
            self._classify_distance(self._smoothed_distance)
            if self._smoothed_distance is not None
            else "too_far"
        )
        return _to_json_safe({
            "face_detected":       False,
            "distance_cm":         last_cm,
            "distance_status":     status,
            "eye_state":           "both_open",
            "glasses_detected":    False,
            "sunglasses_detected": False,
            "both_eyes_visible":   False,
        })