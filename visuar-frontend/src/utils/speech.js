// ─── Voice Guidance Service ───────────────────────────────────────────────────
// Uses the browser SpeechSynthesis API only — no external APIs, no backend.
// Each instruction key maps to 3 distinct phrasings.  The engine cycles
// through variants automatically so consecutive calls never repeat.
// A per-key 5-second cooldown prevents flooding; cancel() ensures no overlap.
// ─────────────────────────────────────────────────────────────────────────────

const LANG_MAP = { en: "en-US", ur: "ur-PK" };
const COOLDOWN_MS = 5000;

// variant rotation counter and last-spoken timestamp, keyed by instruction key
const _idx = {};
const _at  = {};

const MSGS = {
  en: {
    setup_ppi: [
      "Hold a standard credit card against your screen. Use the slider to match the box size to your card exactly.",
      "Please place a credit card on the screen and adjust the slider until the blue box matches your card's width precisely.",
      "To calibrate your screen, align the box with your credit card. Slide to adjust until they match perfectly.",
    ],
    setup_camera: [
      "Please sit 60 to 80 centimeters from your screen — about one arm's length. Click Calibrate when you're ready.",
      "Position yourself roughly 70 centimeters from the screen. Make sure your face is clearly visible, then click Calibrate.",
      "Keep a distance of 60 to 80 centimeters from your screen, look directly at the camera, and press Calibrate.",
    ],
    face_not_detected_camera: [
      "I can't see your face. Please position yourself directly in front of the camera.",
      "Your face isn't detected. Move into the center of the camera view and ensure good lighting.",
      "Please make sure your face is fully visible. Sit straight and look directly at the camera.",
    ],
    move_closer: [
      "You're a bit too far from the screen. Please move slightly closer — the ideal distance is 60 to 80 centimeters.",
      "Move a little closer to the screen. Try to stay between 60 and 80 centimeters away.",
      "You're too far away. Come closer until you're roughly 70 centimeters from the screen.",
    ],
    move_farther: [
      "You're sitting too close to the screen. Please move back slightly — the ideal distance is 60 to 80 centimeters.",
      "You're too close. Step back a little to stay between 60 and 80 centimeters from the screen.",
      "Please move away from the screen. You should be about 70 centimeters away for accurate results.",
    ],
    pre_check_right: [
      "Please cover your right eye completely with your palm. We will be testing your left eye. Blink naturally and keep your face centered.",
      "Cover your right eye fully using your hand. Your left eye should remain open. Look straight at the screen and blink normally.",
      "To begin, block your right eye with your hand. Keep your left eye open, face the camera directly, and blink naturally.",
    ],
    pre_check_left: [
      "Please cover your left eye completely with your palm. We will be testing your right eye. Blink naturally and keep your face centered.",
      "Cover your left eye fully using your hand. Your right eye should remain open. Look straight at the screen and blink normally.",
      "To begin, block your left eye with your hand. Keep your right eye open, face the camera directly, and blink naturally.",
    ],
    pre_check_face_issue: [
      "I can't see your face clearly. Please sit straight and face the camera directly so we can detect your position.",
      "Your face isn't visible. Move into the camera frame, look forward, and make sure the lighting is adequate.",
      "Face detection has failed. Please ensure you're in front of the camera with your face fully visible.",
    ],
    pre_check_distance_issue: [
      "Please adjust your distance. You need to be between 60 and 80 centimeters from the screen for the test to begin.",
      "Your distance is not quite right. Move closer or farther until the distance indicator turns green.",
      "The distance isn't correct yet. Adjust your position so you're about 70 centimeters from the screen.",
    ],
    test_start_snellen: [
      "The test is starting now. Read each letter that appears and say it out loud clearly.",
      "Look at each letter carefully and speak it as clearly as you can. Take your time with each one.",
      "We are beginning the vision test. Say each letter you see on screen clearly when you are ready.",
    ],
    eye_violation_right: [
      "Your right eye appears to be uncovered. Please cover it immediately to continue the test accurately.",
      "I noticed your right eye is open. For valid results, keep it fully covered at all times during the test.",
      "Please cover your right eye again. An uncovered eye affects accuracy and may cause a restart.",
    ],
    eye_violation_left: [
      "Your left eye appears to be uncovered. Please cover it immediately to continue the test accurately.",
      "I noticed your left eye is open. For valid results, keep it fully covered at all times during the test.",
      "Please cover your left eye again. An uncovered eye affects accuracy and may cause a restart.",
    ],
    face_lost_test: [
      "I've lost sight of your face. Please move back into the camera frame and remain still to resume.",
      "Your face has moved out of view. Return to your position, sit straight, and keep your head centered.",
      "The camera cannot detect your face. Please sit upright, face forward, and maintain the correct distance.",
    ],
    test_complete: [
      "Excellent work. The vision test is complete and your results are now being processed.",
      "You have finished the vision test. Please wait a moment while we analyze your results.",
      "Well done. All measurements are complete. We are now preparing your detailed results.",
    ],
    contrast_start: [
      "The test is beginning. A letter E will appear on screen. Press the arrow key that matches the direction it is pointing.",
      "Press the arrow key for the direction the E is facing — up, down, left, or right. The letter will become harder to see over time.",
      "Look at the tumbling E on screen and use your arrow keys to indicate which direction it points. Take your time.",
    ],
  },

  ur: {
    setup_ppi: [
      "اسکرین کے ساتھ اپنا کریڈٹ کارڈ رکھیں اور باکس کو کارڈ کے بالکل برابر کریں۔",
      "براہ کرم کریڈٹ کارڈ اسکرین پر لگائیں اور سلائیڈر سے باکس کو کارڈ کی چوڑائی کے مطابق کریں۔",
      "سلائیڈر کو ہلا کر باکس کو کریڈٹ کارڈ کے بالکل برابر کریں۔",
    ],
    setup_camera: [
      "اسکرین سے ساٹھ سے اسّی سینٹی میٹر کے فاصلے پر بیٹھیں اور کیلیبریٹ دبائیں۔",
      "کیمرے کے سامنے سیدھا بیٹھیں اور ستر سینٹی میٹر کا فاصلہ رکھیں، پھر کیلیبریٹ پر کلک کریں۔",
      "اسکرین سے ایک بازو کے فاصلے پر بیٹھیں، چہرہ کیمرے میں واضح رکھیں اور کیلیبریٹ کریں۔",
    ],
    face_not_detected_camera: [
      "آپ کا چہرہ نظر نہیں آ رہا۔ کیمرے کے بالکل سامنے بیٹھیں۔",
      "چہرہ نہیں مل رہا۔ روشنی درست رکھیں اور کیمرے کے سامنے آئیں۔",
      "براہ کرم سیدھا کیمرے کو دیکھیں تاکہ آپ کا چہرہ واضح نظر آئے۔",
    ],
    move_closer: [
      "آپ اسکرین سے زیادہ دور ہیں۔ تھوڑا قریب آئیں، مثالی فاصلہ ساٹھ سے اسّی سینٹی میٹر ہے۔",
      "قریب آئیں۔ ستر سینٹی میٹر کے فاصلے پر رہنے کی کوشش کریں۔",
      "آپ بہت دور ہیں۔ اسکرین کے قریب آ جائیں۔",
    ],
    move_farther: [
      "آپ اسکرین کے بہت قریب ہیں۔ تھوڑا پیچھے ہٹیں، مثالی فاصلہ ساٹھ سے اسّی سینٹی میٹر ہے۔",
      "پیچھے ہٹیں۔ اسکرین سے ستر سینٹی میٹر کا فاصلہ رکھیں۔",
      "اسکرین سے دور جائیں تاکہ ٹیسٹ کے نتائج درست ہوں۔",
    ],
    pre_check_right: [
      "اپنی دائیں آنکھ اپنے ہاتھ سے مکمل طور پر ڈھانپیں۔ ہم آپ کی بائیں آنکھ کا ٹیسٹ کریں گے۔ قدرتی طور پر پلکیں جھپکائیں۔",
      "دائیں آنکھ ہاتھ سے ڈھک لیں اور بائیں آنکھ کھلی رکھیں۔ سکرین کو سیدھا دیکھیں۔",
      "اپنی دائیں آنکھ چھپائیں اور بائیں آنکھ سے آگے دیکھیں۔ آہستہ پلکیں جھپکاتے رہیں۔",
    ],
    pre_check_left: [
      "اپنی بائیں آنکھ اپنے ہاتھ سے مکمل طور پر ڈھانپیں۔ ہم آپ کی دائیں آنکھ کا ٹیسٹ کریں گے۔ قدرتی طور پر پلکیں جھپکائیں۔",
      "بائیں آنکھ ہاتھ سے ڈھک لیں اور دائیں آنکھ کھلی رکھیں۔ سکرین کو سیدھا دیکھیں۔",
      "اپنی بائیں آنکھ چھپائیں اور دائیں آنکھ سے آگے دیکھیں۔ آہستہ پلکیں جھپکاتے رہیں۔",
    ],
    pre_check_face_issue: [
      "آپ کا چہرہ واضح نظر نہیں آ رہا۔ کیمرے کے سامنے سیدھا بیٹھیں۔",
      "چہرہ نظر نہیں آ رہا۔ کیمرے کے فریم میں آئیں اور آگے دیکھیں۔",
      "چہرے کی شناخت نہیں ہو پا رہی۔ یقینی بنائیں کہ آپ کا پورا چہرہ کیمرے میں نظر آئے۔",
    ],
    pre_check_distance_issue: [
      "اسکرین سے فاصلہ درست نہیں ہے۔ ساٹھ سے اسّی سینٹی میٹر کا فاصلہ رکھیں تاکہ ٹیسٹ شروع ہو سکے۔",
      "فاصلہ ابھی درست نہیں۔ قریب یا دور ہوں یہاں تک کہ انڈیکیٹر سبز ہو جائے۔",
      "فاصلہ ٹھیک نہیں ہے۔ اپنی پوزیشن ایڈجسٹ کریں تاکہ آپ اسکرین سے ستر سینٹی میٹر دور ہوں۔",
    ],
    test_start_snellen: [
      "ٹیسٹ شروع ہو رہا ہے۔ ہر حرف دیکھیں اور واضح آواز میں بولیں۔",
      "ہر حرف کو غور سے دیکھیں اور جب تیار ہوں تو واضح آواز میں بولیں۔",
      "بصارت کا ٹیسٹ شروع ہو رہا ہے۔ سکرین پر ہر حرف بلند آواز سے بولیں۔",
    ],
    eye_violation_right: [
      "آپ کی دائیں آنکھ کھلی ہوئی نظر آ رہی ہے۔ براہ کرم فوری طور پر اسے ڈھانپیں۔",
      "دائیں آنکھ ڈھکی نہیں ہے۔ درست نتائج کے لیے اسے ہر وقت بند رکھیں۔",
      "توجہ کریں، دائیں آنکھ کھلی ہے۔ فوری ڈھانپیں ورنہ ٹیسٹ دوبارہ شروع ہوگا۔",
    ],
    eye_violation_left: [
      "آپ کی بائیں آنکھ کھلی ہوئی نظر آ رہی ہے۔ براہ کرم فوری طور پر اسے ڈھانپیں۔",
      "بائیں آنکھ ڈھکی نہیں ہے۔ درست نتائج کے لیے اسے ہر وقت بند رکھیں۔",
      "توجہ کریں، بائیں آنکھ کھلی ہے۔ فوری ڈھانپیں ورنہ ٹیسٹ دوبارہ شروع ہوگا۔",
    ],
    face_lost_test: [
      "آپ کا چہرہ نظر نہیں آ رہا۔ دوبارہ کیمرے کے سامنے آ جائیں۔",
      "چہرہ فریم سے باہر ہو گیا۔ اپنی جگہ پر واپس آئیں اور سیدھا بیٹھیں۔",
      "کیمرہ آپ کا چہرہ نہیں پکڑ پا رہا۔ سیدھا بیٹھیں اور صحیح فاصلے پر آئیں۔",
    ],
    test_complete: [
      "بہت اچھا۔ بصارت کا ٹیسٹ مکمل ہو گیا ہے اور نتائج تیار ہو رہے ہیں۔",
      "آپ نے ٹیسٹ مکمل کر لیا۔ تھوڑی دیر انتظار کریں جبکہ نتائج مرتب کیے جا رہے ہیں۔",
      "شاباش۔ تمام پیمائشیں مکمل ہیں۔ آپ کے تفصیلی نتائج ابھی تیار ہو رہے ہیں۔",
    ],
    contrast_start: [
      "ٹیسٹ شروع ہو رہا ہے۔ ای حرف اسکرین پر ظاہر ہوگا۔ تیر کی کلید دبا کر اس کی سمت بتائیں۔",
      "E کی سمت دیکھیں اور اوپر، نیچے، بائیں یا دائیں تیر دبائیں۔ وقت کے ساتھ یہ مشکل ہوتا جائے گا۔",
      "اسکرین پر E کی سمت کے مطابق تیر کلید دبائیں۔ جتنا ہو سکے درستگی سے جواب دیں۔",
    ],
  },
};

/**
 * Speak a voice instruction by key.
 * - Cycles through 3 distinct phrasings per key (variant 0 → 1 → 2 → 0 …)
 * - Enforces a 5-second per-key cooldown; excess calls are silently dropped
 * - Cancels any in-progress speech before starting
 *
 * @param {string} key       Instruction key (e.g. "pre_check_right")
 * @param {string} language  i18n code: "en" | "ur"
 */
export function speakInstruction(key, language = "en") {
  if (!("speechSynthesis" in window)) return;
  const now = Date.now();
  if (_at[key] && now - _at[key] < COOLDOWN_MS) return;

  const lang = language in MSGS ? language : "en";
  const variants = MSGS[lang][key];
  if (!variants) return;

  if (_idx[key] === undefined) _idx[key] = 0;
  const text = variants[_idx[key]];
  _idx[key] = (_idx[key] + 1) % variants.length;
  _at[key] = now;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANG_MAP[lang] ?? "en-US";
  utter.rate = 1.0;
  window.speechSynthesis.speak(utter);
}
