/**
 * colorVisionData.js — Plate definitions for the Colour Vision Test.
 *
 * Each plate references a real SVG Ishihara-style image hosted on Supabase Storage.
 * Images are ordered from easiest (Level 1) to hardest (Level 4).
 *
 * Scoring rules (enforced in calcColorVisionScore):
 *   • Correct on hard plate  → big gain
 *   • Correct on easy plate  → small gain
 *   • Wrong on easy plate    → big penalty
 *   • Wrong on hard plate    → small penalty
 */

export const COLOR_PLATES = [
  // ── Level 1: Screening ─────────────────────────────────────────────────────
  {
    id: 1, digit: "12", level: 1,
    correct: "12",
    choices: ["12", "18", "8", "Nothing"],
    imageUrl: "https://mzehrairflcofvzqshri.supabase.co/storage/v1/object/sign/vision%20test/12.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYmVjN2U0ZC02ZWVhLTQ5NjktOTJlNC1mYjk2NjBmYTk4OGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aXNpb24gdGVzdC8xMi5zdmciLCJpYXQiOjE3ODAwNjUzMTksImV4cCI6MTgxMTYwMTMxOX0.dYHRdJuVaOJHdLQqEp5q_rhFwdmDnqVln_RY1-9Rk9k",
  },
  {
    id: 2, digit: "8", level: 1,
    correct: "8",
    choices: ["8", "3", "6", "Nothing"],
    imageUrl: "https://mzehrairflcofvzqshri.supabase.co/storage/v1/object/sign/vision%20test/8-2.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYmVjN2U0ZC02ZWVhLTQ5NjktOTJlNC1mYjk2NjBmYTk4OGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aXNpb24gdGVzdC84LTIuc3ZnIiwiaWF0IjoxNzgwMDY1MzU0LCJleHAiOjE4MTE2MDEzNTR9.UrcrUD3H-Gzp77KnJ8bRH-oywkeRyI-Rucu4YUWf7Kc",
  },

  // ── Level 2: Moderate ──────────────────────────────────────────────────────
  {
    id: 3, digit: "3", level: 2,
    correct: "3",
    choices: ["3", "8", "6", "Nothing"],
    imageUrl: "https://mzehrairflcofvzqshri.supabase.co/storage/v1/object/sign/vision%20test/3-3.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYmVjN2U0ZC02ZWVhLTQ5NjktOTJlNC1mYjk2NjBmYTk4OGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aXNpb24gdGVzdC8zLTMuc3ZnIiwiaWF0IjoxNzgwMDY1MzY4LCJleHAiOjE4MTE2MDEzNjh9.q1G-DttYxCA9jyKzLyqA__Lvgv4lirj9Ya6IgFUYRz4",
  },
  {
    id: 4, digit: "45", level: 2,
    correct: "45",
    choices: ["45", "46", "Nothing", "43"],
    imageUrl: "https://mzehrairflcofvzqshri.supabase.co/storage/v1/object/sign/vision%20test/45-4.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYmVjN2U0ZC02ZWVhLTQ5NjktOTJlNC1mYjk2NjBmYTk4OGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aXNpb24gdGVzdC80NS00LnN2ZyIsImlhdCI6MTc4MDA2NTM4MCwiZXhwIjoxODExNjAxMzgwfQ.7kmv_-fSJo5OuRoxhdEiRI65hsFknGRr7gFW-u8MNTY",
  },

  // ── Level 3: Hard ──────────────────────────────────────────────────────────
  {
    id: 5, digit: "5", level: 3,
    correct: "5",
    choices: ["5", "6", "45", "Nothing"],
    imageUrl: "https://mzehrairflcofvzqshri.supabase.co/storage/v1/object/sign/vision%20test/5-5.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYmVjN2U0ZC02ZWVhLTQ5NjktOTJlNC1mYjk2NjBmYTk4OGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aXNpb24gdGVzdC81LTUuc3ZnIiwiaWF0IjoxNzgwMDY1NDI3LCJleHAiOjE4MTE2MDE0Mjd9.87t98t1q9Zj1UnPxxCYOCYu7Eh4iglCVV1I9siZyFzU",
  },

  // ── Level 4: Diagnostic ────────────────────────────────────────────────────
  {
    id: 6, digit: "46", level: 4,
    correct: "46",
    choices: ["46", "45", "12", "Nothing"],
    imageUrl: "https://mzehrairflcofvzqshri.supabase.co/storage/v1/object/sign/vision%20test/46-6.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYmVjN2U0ZC02ZWVhLTQ5NjktOTJlNC1mYjk2NjBmYTk4OGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aXNpb24gdGVzdC80Ni02LnN2ZyIsImlhdCI6MTc4MDA2NTQxNSwiZXhwIjoxODExNjAxNDE1fQ.c8l3j5XpkcIwuW2oydmXXSjmX-ZHe-bGhO31cOHQ14I",
  },
];

export const TOTAL_PLATES = COLOR_PLATES.length;
export const MAX_LEVEL = 4;
