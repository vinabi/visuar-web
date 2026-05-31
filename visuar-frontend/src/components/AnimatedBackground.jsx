export function AnimatedBackground({ isDarkMode }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className={isDarkMode ? "bubble-dark bubble-1" : "bubble bubble-1"}
      ></div>
      <div
        className={isDarkMode ? "bubble-dark bubble-2" : "bubble bubble-2"}
      ></div>
      <div
        className={isDarkMode ? "bubble-dark bubble-3" : "bubble bubble-3"}
      ></div>
      <div
        className={isDarkMode ? "bubble-dark bubble-4" : "bubble bubble-4"}
      ></div>
      <div
        className={isDarkMode ? "bubble-dark bubble-5" : "bubble bubble-5"}
      ></div>
    </div>
  );
}
