# VISUAR — Test Logic & Formula Reference

Technical documentation for vision test semantics, clinical baselines, platform adaptations, and implemented formulas.

> **Scope:** VISUAR is a **screening tool**, not a clinical prescription system. All diopter outputs are approximate estimates intended to guide follow-up care, not replace licensed refraction.

---

## Quick Reference

| User concern | Primary test | Output |
|--------------|--------------|--------|
| Distance / far blur (myopia) | Distance Eyesight Number Test (Snellen) | Minus sphere (e.g. −1.50 D) |
| Near / reading blur (presbyopia) | Near Eyesight Number Test (Jaeger) | Plus reading add (e.g. +1.50 D) |
| Refined distance sphere | Full Refraction Battery | Fused Snellen + Duochrome + Simulator |
| Test routing only | Blur Screener | No diopter — routes to appropriate battery |

For myopic users, **Snellen acuity** is the primary distance eyesight number. The **Full Refraction Battery** improves accuracy by layering Duochrome refinement and subjective simulator comparison on top.

---

## 1. Platform Adaptations vs. Clinical Practice

### Clinical baseline

| Parameter | Typical clinic |
|-----------|----------------|
| Test distance | 6 m (20 ft) wall chart |
| Refraction | Physical lenses in phoropter |
| Environment | Controlled lighting; fixed chart dimensions |
| Monocular testing | Occluder paddle; examiner observation |

### VISUAR implementation

| Parameter | Platform value |
|-----------|----------------|
| Test distance | 60–80 cm from laptop screen (~70 cm design target) |
| Refraction | Simulated defocus, duochrome panels, acuity staircases |
| Environment | User-controlled; PPI calibration required |
| Monocular testing | Webcam: face presence, distance band, eye cover detection |

Three cross-cutting adaptations apply to all optotype-based tests:

1. **PPI calibration** — Maps CSS pixels to physical millimetres via ISO ID-1 card width (85.6 mm). See [Appendix A](#appendix-a--ppi-calibration--optotype-sizing).
2. **Viewing distance band** — Acuity depends on visual angle, not absolute size. At ~70 cm instead of 6 m, letter heights scale proportionally (`TEST_DISTANCE_CM = 70`).
3. **Webcam gating** — Distance and occlusion are enforced on the user rather than by moving a fixed chart.

---

## Appendix A — PPI Calibration & Optotype Sizing

### A.1 Problem statement

Snellen acuity requires optotypes at a **physically correct size** so they subtend the intended visual angle — not merely "small letters on screen." At 6 m, a decimal 1.0 letter is ~17 mm tall; at 70 cm the same angle requires ~2 mm. The browser exposes pixels, not millimetres. Resolution requires:

1. Screen-specific pixel density (PPI)
2. Geometry-derived letter height in mm, converted to pixels

### A.2 PPI calibration

**PPI** (pixels per inch) is derived from user-matched card width in `PPICalibrator.jsx`:

```
boxWidth   = CSS pixel width matched to physical card
CARD_MM    = 85.6          # ISO/IEC 7810 ID-1
CARD_IN    = 85.6 / 25.4   # ≈ 3.37 inches
PPI        = boxWidth / CARD_IN
```

**Pixel conversion:**

```
pixels = (mm / 25.4) × PPI
```

Sub-12px optotypes use CSS `transform: scale()` to avoid browser minimum font clamping.

| Constant | Role |
|----------|------|
| `mm` | Physical optotype height from geometry |
| `25.4` | mm per inch (unit conversion) |
| `PPI` | Screen-specific pixels per inch |
| `pixels` | Render size on display |

### A.3 Visual acuity and the 5 arcminute rule

Acuity measures the **smallest resolvable detail at a given distance**. At the threshold normal row (decimal 1.0), standard optotypes subtend **5 arcminutes** (ISO 8596 / classic Snellen). Letter height in mm varies with distance; subtended angle does not.

```
height_mm = (2 × distance_mm × tan(5/120°)) / decimal
```

The half-angle formulation (`5/120°`) applies the isosceles-triangle geometry:

```
full height = 2 × distance × tan(half-angle)
```

At 70 cm and decimal 1.0, the precomputed constant:

```
OPTOTYPE_HEIGHT_MM_AT_UNIT_DECIMAL = 2 × 700 × tan(5/120° in radians) ≈ 2.04 mm
```

Per-row height:

```
height_mm = OPTOTYPE_HEIGHT_MM_AT_UNIT_DECIMAL / decimal
display_px = (height_mm / 25.4) × PPI
```

| Decimal | Approx. height (mm @ 70 cm) |
|---------|----------------------------|
| 1.0 | ~2.0 |
| 0.5 | ~4.1 |
| 0.25 | ~8.2 |
| 0.10 | ~20.4 |

Worse acuity → smaller decimal → larger optotype (divide by smaller decimal).

### A.4 Clinic vs. platform comparison

| | Clinic (6 m) | VISUAR (70 cm) |
|---|--------------|----------------|
| Distance | 6000 mm | 700 mm |
| Decimal 1.0 letter | ~17 mm | ~2 mm |
| Subtended angle | 5 arcmin | 5 arcmin |
| Size source | Printed chart | PPI + geometry + webcam |

---

## 2. Distance Eyesight Number Test (Snellen Acuity)

### Clinical basis

Measures **distance visual acuity** — smallest resolvable detail at far. For myopic users, threshold acuity maps to an estimated **minus sphere**.

Standard protocol: Snellen chart at 6 m; staircase to failure; pass criteria typically ≥3/5 letters on a row.

### Platform constraints

A 6 m chart cannot be replicated at 70 cm without recalculating optotype dimensions. Implementation:

- Decimal acuity labels (0.50, 1.0, …) instead of forced 6/X fractions
- Geometry-based height → PPI → pixels pipeline
- CSS scale for sub-minimum font sizes

### Staircase protocol

1. Start at decimal 0.10 (easiest row).
2. Position-matched letter scoring.
3. Pass thresholds:
   - 1 letter → 1 correct
   - 2–3 letters → all correct
   - 4+ letters → ≥ 3 correct
4. Pass → advance; fail → last passed row = threshold acuity.
5. Left eye, then right eye.

### Acuity → myopia estimate

Log-interpolated lookup table calibrated for 60–80 cm screening:

| Decimal acuity | Estimated myopia |
|----------------|------------------|
| 1.0 | 0 D |
| 0.67 | −0.50 D |
| 0.50 | −1.00 D |
| 0.33 | −1.50 D |
| 0.25 | −2.00 D |
| 0.20 | −2.50 D |
| 0.10 | −3.25 D |

```
diopter = log_interpolate(decimal, MYOPIA_TABLE) → round to 0.25 D
```

### Astigmatism extension (post-Snellen)

Runs after both eyes complete Snellen; not a standalone catalog entry.

- **Fan chart** — Darkest meridian → axis (perpendicular rule).
- **Cross slider** — Equal blur on two meridians → cylinder magnitude.

```
CYL  = −(slider_step × 0.25) D
axis = (darkest_line_angle + 90°) mod 180
```

---

## 3. Near Eyesight Number Test (Jaeger)

### Clinical basis

Measures **near reading acuity** at ~40 cm using N-number notation. Maps to **plus reading add** for presbyopia — distinct from distance myopia estimation.

### Platform adaptation

Design distance is **70 cm** (aligned with distance tests and webcam gating). Print height scales from the 40 cm reference:

```
height_mm = (N / 8) × 2.9 mm × (70 / 40)
```

Reference: N8 ≈ 2.9 mm cap height at 40 cm ≈ normal near (decimal 1.0).

```
near_decimal = (8 / N) × (40 / 70)
```

N → J label (J1–J20) via anchor table and log interpolation.

### Reading add mapping

| Near decimal | Reading add |
|--------------|-------------|
| ≥ 1.0 | 0 D |
| ≥ 0.75 | +1.125 D |
| ≥ 0.50 | +1.625 D |
| ≥ 0.29 | +2.25 D |
| worse | +2.50 D |

Same staircase pass rules as Snellen.

---

## 4. Landolt C Acuity

### Clinical basis

ISO 8596 tumbling ring — distance acuity without letter-identity confounds (C vs G, etc.).

### Ring sizing (ISO 8596 adapted)

At 50 cm reference, outer diameter at decimal 1.0:

```
D_mm = (3.636 / decimal) × (distance_cm / 50)
stroke = gap = D / 5
```

### Protocol

- 9 tiers (decimal 0.29 → 2.0)
- 5 trials per tier; **4/5 (80%)** required to pass
- Fail → result = previous tier
- Optional near/far switching at 50 cm / 100 cm (ring diameter doubles with distance to preserve angle)

### Diopter estimate

Separate from Snellen table:

```
SPH ≈ −1 × (0.35 / decimal)   → round to 0.25 D
```

---

## 5. Duochrome Test (Red–Green Balance)

### Clinical basis

Refines sphere by ~**±0.25 D** after an initial estimate. Longitudinal chromatic aberration causes red and green to focus at slightly different depths:

| Observation | Interpretation |
|-------------|----------------|
| Red sharper | Sphere too minus (over-corrected myopia) |
| Green sharper | Sphere too plus |
| Equal | Balanced sphere |

Clinical protocol: balanced red/green filters; ±0.25 D steps until parity.

### Platform implementation

- Simulated red/green panels (no physical filters)
- Initial sphere from Snellen estimate (`initialDiopter`)
- Stepped adjustment schedule:

```
rounds 0–2:  ±0.50 D per choice
rounds 3–6:  ±0.25 D
rounds 7+:   ±0.125 D

red clearer   → subtract D
green clearer → add D
```

- Optotype size decreases each round
- Catch trial at round 7
- **Requires bare eyes** — corrective lenses invalidate chromatic comparison

---

## 6. Refraction Simulator

### Clinical basis

Subjective refraction: patient compares lens pairs until sharpest image is identified.

### Platform implementation

Canvas blur simulates defocus at candidate diopters:

```
blur_sigma = min(12, |diopter| × letter_px × 0.055)
```

**Binary search:**

- Left vs. right panel at `mid − step` and `mid + step`
- User selection narrows `[low, high]`
- Termination: range ≤ **0.25 D** or max comparisons reached

Highest weight in battery fusion (see §7).

---

## 7. Full Refraction Battery

### Test order

| Focus mode | Sequence |
|------------|----------|
| Distance | Snellen → Duochrome → Simulator |
| Near | Jaeger → Near–Far → Duochrome → Simulator |

### Fusion formula

Weighted average per eye:

```
final_SPH = (w_snellen × snellenD + w_duochrome × duochromeD + w_simulator × simulatorD)
            / (w_snellen + w_duochrome + w_simulator)

w_snellen    ≈ 0.25 × consistency
w_duochrome  ≈ 0.10–0.25  (scales with reliability score)
w_simulator  ≈ 0.50 × consistency
```

Snellen provides the anchor; Duochrome refines; Simulator carries primary subjective weight.

---

## 8. Contrast Sensitivity

### Clinical basis

Resolution of **low-contrast** targets at fixed size — distinct from acuity (size threshold). Relevant for glare, media opacity, and neural contrast processing.

### Platform implementation

- ~70 cm distance; fixed pixel size per level early in staircase
- 15 levels: **90% → 3%** contrast
- Same typing and pass thresholds as Snellen
- Faintest passed level = contrast threshold
- **Does not contribute to diopter estimate**

```
gray = 255 × (1 − percent/100)   # on light background
```

---

## 9. Near–Far Switching

### Clinical basis

**Accommodation** — speed and accuracy of focus shift between near and far targets.

### Platform implementation

User moves between webcam-enforced distances (chart cannot move):

| Round type | Target distance |
|------------|-----------------|
| Near | ~50 cm |
| Far | ~100 cm |

Letter size scales to preserve visual angle:

```
display_px_far = display_px_near × 2
```

4 alternating rounds (far 0.33 → near N10 → far 0.50 → near N8). **No diopter output** — flexibility metric only.

---

## 10. Colour Vision Test

### Clinical basis

Ishihara-style screening for **red–green deficiency** — unrelated to refractive error.

### Platform implementation

- 14 procedural SVG plates, 4 difficulty levels
- Monocular (one eye at a time)
- Weighted scoring: easy-plate misses penalized; hard-plate hits rewarded
- **No diopter estimate**

---

## 11. Blur Screener & Quick Screener

### Purpose

Triage routing only — no prescription mathematics.

### Blur Screener (self-report)

5 distance letters + 5 near words at medium difficulty. User marks correct / wrong / unsure.

```
score = correct / total
weak  if score < 75%

distance weak only → Snellen path
near weak only     → Jaeger path
both weak          → full assessment
both OK            → optional browse
```

### Quick Screener (mini staircase)

One Snellen row (decimal 0.33) + one Jaeger row (N8) with full pass/fail logic. Same routing rules; higher rigour than self-report.

---

## 12. Test Selection FAQ

| Question | Answer |
|----------|--------|
| Which test gives a distance glasses number? | Snellen acuity. Full Refraction Battery for best accuracy. |
| Snellen vs. Landolt? | Both measure distance acuity. Snellen uses letter identity and the myopia table; Landolt uses gap orientation — higher precision, separate diopter formula. |
| Role of Duochrome? | Fine-tunes sphere ±0.25 D after Snellen; does not establish prescription from scratch. |
| Why 70 cm instead of 6 m? | Laptop form factor. Visual angle preserved via mm-based sizing, PPI calibration, and webcam distance verification. |
| Why credit-card calibration? | Pixel density varies per display. Without PPI, decimal labels do not correspond to physical acuity levels. |
| Is output a clinical prescription? | No. Screening estimate only. Simplified astigmatism model. Professional examination recommended for dispensing. |

---

## 13. Formula Reference

```
# PPI & sizing
PPI                    = box_px / 3.37
px_from_mm             = (mm / 25.4) × PPI

# Snellen
height_mm              = OPTOTYPE_HEIGHT_MM_AT_UNIT_DECIMAL / decimal
myopia_D               = log_interpolate(MYOPIA_TABLE, decimal) → round 0.25 D

# Jaeger
height_mm              = (N/8) × 2.9 × (70/40)
near_decimal           = (8/N) × (40/70)
reading_add            = band_table(near_decimal)

# Landolt
diameter_mm            = (3.636/decimal) × (distance_cm/50)
SPH                    = −0.35/decimal → round 0.25 D

# Duochrome
adjust                 = red → −step, green → +step
step_schedule          = 0.50 D → 0.25 D → 0.125 D

# Simulator
blur_sigma             = min(12, |D| × letter_px × 0.055)
search                 = binary search until ±0.25 D

# Battery fusion
final_SPH              = weighted_mean(Snellen, Duochrome, Simulator)
weights                = ~25% / 10–25% / ~50% (consistency-scaled)

# Astigmatism (post-Snellen)
CYL                    = −slider_step × 0.25
axis                   = darkest_line + 90° (mod 180)

# Contrast
output                 = faintest % level passed (no diopter)

# Blur screener
weak                   = correct/total < 75%
```

---

## Related Documentation

- Implementation: `visuar-frontend/src/utils/` (acuity, diopter, fusion modules)
- PPI UI: `visuar-frontend/src/components/PPICalibrator.jsx`
- Test catalog: `visuar-frontend/src/utils/testCatalog.js`
- Webcam module: `visuar-backend/vision_module/README.md`
