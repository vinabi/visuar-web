import { Sparkles, CheckCircle2, XCircle, Apple } from "lucide-react";

function BulletList({ items, isDarkMode, icon: Icon, accent }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((text, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${accent}`} />
          <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Extended AI blocks: bilingual summary, lifestyle do/avoid, nutrition notes, safety.
 */
export function TestResultsAIInsight({ ai, isDarkMode, loading }) {
  if (loading) {
    return (
      <div className={`rounded-2xl p-6 mt-6 animate-pulse ${isDarkMode ? "bg-slate-800/40" : "bg-slate-50"}`}>
        <div className={`h-6 w-48 rounded mb-4 ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />
        <div className={`h-20 rounded ${isDarkMode ? "bg-slate-700/50" : "bg-slate-100"}`} />
      </div>
    );
  }

  if (!ai) return null;

  const screening = ai.screening || ai;
  const summaryEn = screening.summary_en || ai.summary;
  const summaryUr = screening.summary_ur || ai.summary_ur;
  const doEn = screening.lifestyle_do_en || ai.lifestyle_do_en || [];
  const doUr = screening.lifestyle_do_ur || ai.lifestyle_do_ur || [];
  const avoidEn = screening.lifestyle_avoid_en || ai.lifestyle_avoid_en || [];
  const avoidUr = screening.lifestyle_avoid_ur || ai.lifestyle_avoid_ur || [];
  const nutritionEn = screening.nutrition_notes_en || ai.nutrition_notes_en;
  const nutritionUr = screening.nutrition_notes_ur || ai.nutrition_notes_ur;
  const safetyEn = screening.safety_note_en || ai.safety_note_en;
  const safetyUr = screening.safety_note_ur || ai.safety_note_ur;

  const hasContent =
    summaryEn ||
    summaryUr ||
    doEn.length ||
    avoidEn.length ||
    nutritionEn ||
    safetyEn;

  if (!hasContent) return null;

  const panel = isDarkMode
    ? "bg-gradient-to-br from-purple-500/8 to-cyan-500/8 border border-purple-500/20"
    : "bg-gradient-to-br from-purple-50 to-cyan-50 border border-purple-100";

  return (
    <div className={`rounded-2xl p-6 mt-6 space-y-6 ${panel}`}>
      <h3
        className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}
      >
        <Sparkles className={`w-5 h-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
        AI explanation
        <span
          className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
            isDarkMode ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
          }`}
        >
          Personalized
        </span>
      </h3>

      {summaryEn && (
        <div>
          <p className={`text-xs font-semibold uppercase mb-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            What your results mean
          </p>
          <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
            {summaryEn}
          </p>
        </div>
      )}

      {summaryUr && (
        <div>
          <p className={`text-xs font-semibold uppercase mb-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            اردو
          </p>
          <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
            {summaryUr}
          </p>
        </div>
      )}

      {doEn.length > 0 && (
        <div>
          <h4 className={`text-sm font-bold mb-2 ${isDarkMode ? "text-cyan-400" : "text-cyan-700"}`}>
            Helpful habits
          </h4>
          <BulletList
            items={doEn}
            isDarkMode={isDarkMode}
            icon={CheckCircle2}
            accent={isDarkMode ? "text-green-400" : "text-green-600"}
          />
          {doUr.length > 0 && (
            <div className="mt-3">
              <BulletList
                items={doUr}
                isDarkMode={isDarkMode}
                icon={CheckCircle2}
                accent={isDarkMode ? "text-green-400" : "text-green-600"}
              />
            </div>
          )}
        </div>
      )}

      {avoidEn.length > 0 && (
        <div>
          <h4 className={`text-sm font-bold mb-2 ${isDarkMode ? "text-amber-400" : "text-amber-700"}`}>
            Worth limiting
          </h4>
          <BulletList
            items={avoidEn}
            isDarkMode={isDarkMode}
            icon={XCircle}
            accent={isDarkMode ? "text-amber-400" : "text-amber-600"}
          />
          {avoidUr.length > 0 && (
            <div className="mt-3">
              <BulletList
                items={avoidUr}
                isDarkMode={isDarkMode}
                icon={XCircle}
                accent={isDarkMode ? "text-amber-400" : "text-amber-600"}
              />
            </div>
          )}
        </div>
      )}

      {nutritionEn && (
        <div className={`rounded-xl p-4 ${isDarkMode ? "bg-slate-800/50" : "bg-white/80"}`}>
          <h4
            className={`text-sm font-bold mb-2 flex items-center gap-2 ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            <Apple className={`w-4 h-4 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
            Nutrition & wellness (general)
          </h4>
          <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
            {nutritionEn}
          </p>
          {nutritionUr && (
            <p
              className={`text-sm leading-relaxed mt-2 ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {nutritionUr}
            </p>
          )}
        </div>
      )}

      {(safetyEn || safetyUr) && (
        <p className={`text-xs italic leading-relaxed ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
          {safetyEn}
          {safetyUr && (
            <span className="block mt-2">
              {safetyUr}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
