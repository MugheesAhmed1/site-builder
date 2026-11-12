// Springs for plain CSS. CSS has no spring easing, so we solve a damped spring and
// sample it into a linear() easing that a normal `transition` can use.
//
// visualDuration is how long the move looks like it takes. bounce runs from 0 (settles
// with no overshoot) to 1 (wobbles a lot). The returned duration is longer than
// visualDuration because it also covers the small settle at the end, so time any
// sibling transitions (opacity, colour) off visualDuration, not off the result.
//
// Inside Motion, use { type: "spring", visualDuration, bounce } directly instead: a real
// spring keeps its speed when interrupted, a sampled curve cannot.

// Position (0 to 1) of a unit-mass spring released from 0 towards 1, at time t seconds.
export function springAt(t, visualDuration, bounce) {
  const omega = (2 * Math.PI) / visualDuration; // natural frequency
  const zeta = 1 - Math.min(Math.max(bounce, 0), 0.99); // damping ratio
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const decay = zeta * omega;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-decay * t) * (Math.cos(wd * t) + (decay / wd) * Math.sin(wd * t));
}

// Time after which the spring stays within `rest` of the target.
function settleTime(visualDuration, bounce, rest) {
  const step = 1 / 240;
  const limit = visualDuration * 10;
  let last = 0;
  for (let t = 0; t <= limit; t += step) {
    if (Math.abs(1 - springAt(t, visualDuration, bounce)) > rest) last = t;
  }
  return Math.min(last + step, limit);
}

function round(n, places) {
  const f = 10 ** places;
  const r = Math.round(n * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

export function cssSpring({ visualDuration = 0.4, bounce = 0.2, rest = 0.001 } = {}) {
  const duration = settleTime(visualDuration, bounce, rest);
  // About one point every 16ms is smooth to the eye; keep the string short.
  const points = Math.min(Math.max(Math.ceil(duration / 0.016), 12), 64);
  const values = [];
  for (let i = 0; i <= points; i++) {
    const v = i === points ? 1 : springAt((duration * i) / points, visualDuration, bounce);
    values.push(round(v, 4));
  }
  const seconds = round(duration, 3);
  return {
    duration: seconds,
    easing: `linear(${values.join(", ")})`,
    // The `<duration> <easing>` half of a transition, e.g. `transform ${css}`.
    css: `${seconds}s linear(${values.join(", ")})`,
  };
}

// The springs the site styles use. Each is written into the CSS as a custom property
// (portfolio.css and cast.css), and a test keeps the CSS in step with these numbers.
export const CSS_SPRINGS = {
  // Hover lifts and small nudges: quick, with a hint of overshoot.
  "--pf-spring-hover": { visualDuration: 0.28, bounce: 0.18 },
  // Pointer-following shapes: soft and a little slower, no wobble.
  "--sc-spring-follow": { visualDuration: 0.5, bounce: 0.08 },
};
