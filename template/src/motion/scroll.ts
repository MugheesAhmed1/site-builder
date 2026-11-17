// Scroll orchestration (PRD section 15): scroll is an input device. One conductor per page
// measures every scene and turns the scroll position into the stage position, a fractional
// scene index: 2.0 means the third scene is centred on screen, 2.5 is halfway to the fourth.
// The stage, the typography and the scroll mappings all read it. This replaces GSAP
// ScrollTrigger with a few lines of our own (see docs/ARCHITECTURE.md).

export interface ScrollState {
  /** Fractional scene index, eased. */
  pos: number;
  /** The raw value before easing. */
  target: number;
  /** 0 to 1 over the whole page. */
  page: number;
  /** Progress through each scene, 0 when its top meets the bottom of the screen, 1 when its bottom leaves the top. */
  local: number[];
  /** Pixels per frame, for effects that respond to speed. */
  velocity: number;
  active: number;
}

type Listener = (s: ScrollState) => void;

export class Conductor {
  private scenes: HTMLElement[] = [];
  private tops: number[] = [];
  private heights: number[] = [];
  private listeners = new Set<Listener>();
  private raf = 0;
  private lastY = -1;
  private ease: number;
  state: ScrollState = { pos: 0, target: 0, page: 0, local: [], velocity: 0, active: 0 };

  private scroller: HTMLElement | null;
  private ro: ResizeObserver | null = null;

  /** scroller: the element that scrolls (the studio preview), or null for the window. */
  constructor(scroller: HTMLElement | null, opts: { ease?: number } = {}) {
    this.scroller = scroller;
    this.ease = opts.ease ?? 0.12;
  }

  scrollY() {
    return this.scroller ? this.scroller.scrollTop : window.scrollY;
  }

  viewHeight() {
    return this.scroller ? this.scroller.clientHeight : window.innerHeight;
  }

  private originTop() {
    return this.scroller ? this.scroller.getBoundingClientRect().top : 0;
  }

  setScenes(els: HTMLElement[]) {
    this.scenes = els;
    this.measure();
  }

  setEase(e: number) {
    this.ease = e;
  }

  measure = () => {
    const y = this.scrollY();
    const o = this.originTop();
    this.tops = this.scenes.map((el) => el.getBoundingClientRect().top - o + y);
    this.heights = this.scenes.map((el) => el.offsetHeight || 1);
    this.lastY = -1;
  };

  private compute(): number {
    const y = this.scrollY();
    const vh = this.viewHeight();
    const focus = y + vh * 0.5;
    const n = this.scenes.length;
    if (!n) return 0;
    let i = 0;
    while (i < n - 1 && focus >= this.tops[i + 1]) i++;
    const local = Math.max(0, Math.min(1, (focus - this.tops[i]) / this.heights[i]));
    // A scene's beat is reached when its middle crosses the middle of the screen.
    const target = Math.max(0, Math.min(n - 1, i + local - 0.5));
    const max = (this.scroller ? this.scroller.scrollHeight : document.documentElement.scrollHeight) - vh;
    this.state.page = max > 0 ? Math.min(1, y / max) : 0;
    this.state.local = this.tops.map((t, k) => Math.max(0, Math.min(1, (y + vh - t) / (this.heights[k] + vh))));
    this.state.active = i;
    return target;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  /** Reduced motion: no easing, the stage jumps to whole scenes. */
  step = false;

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick);
    const y = this.scrollY();
    if (y !== this.lastY) {
      this.state.velocity = this.lastY < 0 ? 0 : y - this.lastY;
      this.lastY = y;
      this.state.target = this.compute();
    } else this.state.velocity *= 0.85;
    const s = this.state;
    const goal = this.step ? Math.round(s.target) : s.target;
    const d = goal - s.pos;
    if (Math.abs(d) < 0.0005 && Math.abs(s.velocity) < 0.01) {
      if (s.pos !== goal) s.pos = goal;
      else return;
    } else s.pos = this.step ? goal : s.pos + d * this.ease;
    for (const l of this.listeners) l(s);
  };

  start() {
    if (this.raf) return;
    this.measure();
    this.state.target = this.compute();
    this.state.pos = this.step ? Math.round(this.state.target) : this.state.target;
    window.addEventListener("resize", this.measure);
    if (typeof ResizeObserver !== "undefined" && this.scenes[0]?.parentElement) {
      this.ro = new ResizeObserver(() => this.measure());
      this.ro.observe(this.scenes[0].parentElement);
    }
    this.raf = requestAnimationFrame(this.tick);
    for (const l of this.listeners) l(this.state);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener("resize", this.measure);
    this.ro?.disconnect();
    this.ro = null;
  }
}
