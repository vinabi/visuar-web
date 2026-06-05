/**
 * Instant screening findings for near-vision results — shown immediately while AI loads.
 */

function readingAddLabel(sph) {
  const d = Number(sph);
  if (!Number.isFinite(d) || d < 0.25) return "no significant reading add";
  return `+${d.toFixed(2)} D estimated reading add`;
}

function describeJaegerEye(eye) {
  const label = eye.jaegerJ || eye.acuity || "—";
  const add = eye.sph ?? eye.diopter;
  const cyl = eye.cyl ?? 0;
  let text = `Near acuity ${label}`;
  if (add != null) text += ` (${readingAddLabel(add)})`;
  if (Math.abs(cyl) >= 0.25 && eye.axis != null) {
    text += `; astigmatism screening ${Number(cyl).toFixed(2)} D at axis ${eye.axis}°`;
  }
  return text;
}

export function buildJaegerFindings(leftEye, rightEye) {
  const findings = [];

  if (leftEye?.acuity || leftEye?.jaegerJ) {
    findings.push({
      type: "info",
      title: "Left eye — near vision",
      description: `${describeJaegerEye(leftEye)}.`,
    });
  }
  if (rightEye?.acuity || rightEye?.jaegerJ) {
    findings.push({
      type: "info",
      title: "Right eye — near vision",
      description: `${describeJaegerEye(rightEye)}.`,
    });
  }

  const lAdd = leftEye?.sph ?? leftEye?.diopter ?? 0;
  const rAdd = rightEye?.sph ?? rightEye?.diopter ?? 0;
  if (Math.abs(lAdd - rAdd) >= 0.5) {
    findings.push({
      type: "warning",
      title: "Eyes differ",
      description:
        "Your left and right near estimates differ — an eye exam can confirm whether each eye needs a different correction.",
    });
  }

  const maxAdd = Math.max(lAdd, rAdd);
  if (maxAdd >= 2.0) {
    findings.push({
      type: "warning",
      title: "Strong near blur signal",
      description:
        "This screening suggests difficulty with small near print — reading glasses or an updated prescription may help.",
    });
  } else if (maxAdd < 0.25) {
    findings.push({
      type: "success",
      title: "Near vision in normal range",
      description:
        "At screening distance you read small near print in the expected range — continue routine eye check-ups.",
    });
  }

  findings.push({
    type: "info",
    title: "Screening only",
    description:
      "Jaeger estimates a reading add (+D) for near blur, not distance myopia. This is not a clinical prescription.",
  });

  return findings;
}

export function buildJaegerRecommendations(leftEye, rightEye) {
  const recs = [];
  const maxAdd = Math.max(
    leftEye?.sph ?? leftEye?.diopter ?? 0,
    rightEye?.sph ?? rightEye?.diopter ?? 0
  );

  if (maxAdd >= 1.25) {
    recs.push(
      "If phone, book, or laptop text stays blurry at arm's length, ask an optometrist about reading glasses or progressive lenses."
    );
  }
  if (Math.abs(leftEye?.cyl ?? 0) >= 0.25 || Math.abs(rightEye?.cyl ?? 0) >= 0.25) {
    recs.push(
      "Astigmatism was detected in screening — a professional refraction can confirm cylinder and axis before ordering glasses."
    );
  }
  recs.push("Read at 40–50 cm with bright, even lighting; increase font size if you strain.");
  recs.push("Use the 20-20-20 rule during long screen sessions.");
  recs.push("Confirm any glasses change with a licensed eye care professional.");
  return recs;
}

export function buildNearFarFindings(nearFarData) {
  if (!nearFarData) return [];
  const score = nearFarData.nearFarScore ?? 0;
  const passed = nearFarData.roundsPassed ?? 0;
  const total = nearFarData.totalRounds ?? 4;
  const findings = [
    {
      type: score >= 70 ? "success" : score >= 45 ? "info" : "warning",
      title: `Focus switching score: ${score}`,
      description: `You passed ${passed} of ${total} near–far distance switches during this screening.`,
    },
  ];
  if (score < 45) {
    findings.push({
      type: "warning",
      title: "Slow accommodation signal",
      description:
        "Difficulty shifting focus between near and far may relate to eye fatigue, uncorrected vision, or presbyopia — consider a professional exam.",
    });
  }
  findings.push({
    type: "info",
    title: "Screening only",
    description: "Near–far switching measures focus flexibility, not a full prescription.",
  });
  return findings;
}

export function buildNearFarRecommendations(nearFarData) {
  const score = nearFarData?.nearFarScore ?? 0;
  const recs = [];
  if (score < 70) {
    recs.push("Rest your eyes for a few minutes, then retest in a quiet room with stable head position.");
  }
  recs.push("When reading on a screen, look at something far away every 20 minutes for 20 seconds.");
  recs.push("If near and far both feel blurry, complete the Full Near Vision Battery for a fuller estimate.");
  recs.push("This is a screening result — visit an eye care professional for diagnosis.");
  return recs;
}

export function buildRefractionFindings(leftEye, rightEye, { visionFocus } = {}) {
  const findings = [];
  const isNear = visionFocus === "near";

  const describeRx = (eye, side) => {
    const sph = eye.sph ?? eye.diopter;
    const cyl = eye.cyl ?? 0;
    const axis = eye.axis;
    if (sph == null) return null;
    const sphStr = sph > 0 ? `+${Number(sph).toFixed(2)}` : Number(sph).toFixed(2);
    let text = `${side}: ${sphStr} D sphere`;
    if (Math.abs(cyl) >= 0.25 && axis != null) {
      text += `, ${Number(cyl).toFixed(2)} D cylinder at ${axis}°`;
    }
    if (isNear) text += " (reading-add screening)";
    return text;
  };

  const leftDesc = describeRx(leftEye, "Left eye");
  const rightDesc = describeRx(rightEye, "Right eye");
  if (leftDesc) {
    findings.push({ type: "info", title: "Left eye estimate", description: `${leftDesc}.` });
  }
  if (rightDesc) {
    findings.push({ type: "info", title: "Right eye estimate", description: `${rightDesc}.` });
  }

  const conf = Math.round(((leftEye?.confidence ?? 70) + (rightEye?.confidence ?? 70)) / 2);
  findings.push({
    type: conf >= 75 ? "success" : "info",
    title: `Screening confidence: ${conf}%`,
    description:
      "Fused from acuity, astigmatism, duochrome, and simulator steps — still a screening estimate, not a prescription.",
  });

  findings.push({
    type: "info",
    title: "Screening only",
    description: "Battery results combine multiple modules for a fuller estimate — confirm with an optometrist.",
  });
  return findings;
}

export function buildRefractionRecommendations(leftEye, rightEye, { visionFocus } = {}) {
  const recs = [];
  const isNear = visionFocus === "near";
  const maxAdd = Math.max(leftEye?.sph ?? leftEye?.diopter ?? 0, rightEye?.sph ?? rightEye?.diopter ?? 0);

  if (isNear && maxAdd >= 1.0) {
    recs.push("Your fused near estimate suggests reading support may help — try an eye exam before buying readers.");
  }
  if (!isNear && ((leftEye?.sph ?? 0) < -0.5 || (rightEye?.sph ?? 0) < -0.5)) {
    recs.push("Distance blur screening suggests minus sphere — distance glasses may help; confirm with a professional exam.");
  }
  recs.push("Retest with bare eyes and good lighting if you wore glasses during parts of the battery.");
  recs.push("Visit an eye care professional to validate sphere, cylinder, and axis before changing prescription.");
  return recs;
}
