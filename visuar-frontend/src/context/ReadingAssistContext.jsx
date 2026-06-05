import { createContext, useContext, useState, useEffect, useCallback } from "react";

export const READING_ASSIST_STORAGE_KEY = "visuar_reading_assist";

export const READING_ASSIST_MODES = {
  OFF: "off",
  LARGE: "large",
};

function normalizeMode(value) {
  if (value === READING_ASSIST_MODES.LARGE) return READING_ASSIST_MODES.LARGE;
  // Migrate older hover / both preferences
  if (value === "hover" || value === "both") return READING_ASSIST_MODES.LARGE;
  return READING_ASSIST_MODES.OFF;
}

function applyReadingAssistToDocument(mode) {
  const root = document.documentElement;
  if (mode === READING_ASSIST_MODES.LARGE) {
    root.setAttribute("data-reading-assist", "large");
  } else {
    root.removeAttribute("data-reading-assist");
  }
}

const ReadingAssistContext = createContext(null);

export function useReadingAssist() {
  const ctx = useContext(ReadingAssistContext);
  if (!ctx) {
    throw new Error("useReadingAssist must be used within ReadingAssistProvider");
  }
  return ctx;
}

export function ReadingAssistProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    const saved = localStorage.getItem(READING_ASSIST_STORAGE_KEY);
    return normalizeMode(saved);
  });

  useEffect(() => {
    applyReadingAssistToDocument(mode);
    localStorage.setItem(READING_ASSIST_STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((next) => {
    setModeState(normalizeMode(next));
  }, []);

  const largeTextEnabled = mode === READING_ASSIST_MODES.LARGE;

  return (
    <ReadingAssistContext.Provider value={{ mode, setMode, largeTextEnabled }}>
      {children}
    </ReadingAssistContext.Provider>
  );
}

applyReadingAssistToDocument(
  normalizeMode(localStorage.getItem(READING_ASSIST_STORAGE_KEY))
);
