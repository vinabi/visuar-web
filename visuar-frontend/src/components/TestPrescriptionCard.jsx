import { formatPrescription } from "../utils/refractionMath";

/**
 * Per-eye estimated prescription (SPH / CYL / AXIS) after a single test.
 */
export function TestPrescriptionCard({ leftEye, rightEye, isDarkMode, title = "Estimated prescription" }) {
  const panel = isDarkMode
    ? "bg-slate-800/50 border border-slate-700/50"
    : "bg-slate-50 border border-slate-200";

  const renderEye = (label, eye) => {
    if (!eye) return null;
    const sph = eye.sph ?? eye.sphereD ?? eye.diopter;
    const cyl = eye.cyl ?? eye.cylinderD ?? 0;
    const axis = eye.axis ?? eye.estimatedAxis;
    const formatted =
      eye.prescriptionLabel ??
      (sph != null ? formatPrescription({ sph, cyl, axis: cyl ? axis : null }) : null);

    return (
      <div className={`rounded-xl p-4 ${isDarkMode ? "bg-slate-900/60" : "bg-white border border-slate-100"}`}>
        <p className={`text-xs font-bold uppercase mb-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
          {label}
        </p>
        {formatted ? (
          <p className={`text-base font-bold font-mono ${isDarkMode ? "text-cyan-400" : "text-cyan-700"}`}>
            {formatted}
          </p>
        ) : (
          <p className={`text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Not measured</p>
        )}
        {sph != null && (
          <dl className={`mt-2 grid grid-cols-3 gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            <div>
              <dt className="opacity-70">SPH</dt>
              <dd className="font-bold">{sph > 0 ? "+" : ""}{sph?.toFixed(2)} D</dd>
            </div>
            <div>
              <dt className="opacity-70">CYL</dt>
              <dd className="font-bold">{Math.abs(cyl) >= 0.25 ? `${cyl.toFixed(2)} D` : "—"}</dd>
            </div>
            <div>
              <dt className="opacity-70">AXIS</dt>
              <dd className="font-bold">{Math.abs(cyl) >= 0.25 && axis != null ? `${axis}°` : "—"}</dd>
            </div>
          </dl>
        )}
      </div>
    );
  };

  if (!leftEye && !rightEye) return null;

  return (
    <div className={`rounded-2xl p-5 mb-6 ${panel}`}>
      <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        {title}
      </h3>
      <div className="grid md:grid-cols-2 gap-3">
        {renderEye("Left eye", leftEye)}
        {renderEye("Right eye", rightEye)}
      </div>
    </div>
  );
}
