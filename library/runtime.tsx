// The block library runtime (docs/LIBRARY.md). A template loads it when its content lists blocks
// under `extras`: each one is drawn, with its settings, into the template's [data-xp-extras]
// spot (or the end of the page). Blocks load on demand, so a page only fetches the ones it uses.
// In the builder's preview it redraws whenever the studio sends new content.
import { Component, Suspense, lazy, type ComponentType, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Props } from './kit';

type Block = ComponentType<{ props: Props }>;
type Extra = { block: string; props?: Props };

const loaders = import.meta.glob<{ default: Block }>('./blocks/*.tsx');
const metas = import.meta.glob<{ defaults: Props }>('./blocks/*.json', { eager: true, import: 'default' });
const lazies = new Map<string, Block>();

function blockFor(id: string): Block | null {
  const load = loaders[`./blocks/${id}.tsx`];
  if (!load) return null;
  if (!lazies.has(id)) lazies.set(id, lazy(load));
  return lazies.get(id)!;
}

class Guard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Extras({ list }: { list: Extra[] }) {
  return (
    <>
      {list.map((x, i) => {
        const B = blockFor(String(x.block));
        if (!B) return null;
        const defaults = (metas[`./blocks/${x.block}.json`] as unknown as { defaults: Props })?.defaults || {};
        return (
          <div key={`${i}-${x.block}`} className="xpl" data-xpl={x.block} style={{ position: 'relative', fontFamily: 'inherit' }}>
            <Guard>
              <Suspense fallback={<div style={{ minHeight: 120 }} />}>
                <B props={{ ...defaults, ...(x.props || {}) }} />
              </Suspense>
            </Guard>
          </div>
        );
      })}
    </>
  );
}

declare global {
  interface Window {
    __XP__?: Props;
    __XP_HASH__?: Props;
    __XP_PREVIEW__?: boolean;
    __XP_LIB_ON__?: boolean;
  }
}

function start() {
  if (window.__XP_LIB_ON__) return;
  window.__XP_LIB_ON__ = true;
  let data: Props = window.__XP_HASH__ || window.__XP__ || {};
  let host: Element | null = null;
  let root: Root | null = null;

  const place = () => {
    const want = document.querySelector('[data-xp-extras]');
    if (host && host.isConnected && (!want || want === host)) return;
    root?.unmount();
    host = want;
    if (!host) {
      host = document.createElement('div');
      host.setAttribute('data-xp-extras', '');
      document.body.appendChild(host);
    }
    root = createRoot(host);
  };
  const draw = () => {
    place();
    const list = Array.isArray(data.extras) ? (data.extras as Extra[]).filter((x) => x && typeof x.block === 'string') : [];
    root!.render(<Extras list={list} />);
  };

  draw();
  // The template may draw its own spot after this script runs, or redraw it: follow it.
  let pending = 0;
  new MutationObserver(() => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      const want = document.querySelector('[data-xp-extras]');
      if (!host || !host.isConnected || (want && want !== host)) draw();
    });
  }).observe(document.body, { childList: true, subtree: true });

  if (window.__XP_PREVIEW__) {
    window.addEventListener('message', (e) => {
      if (e.source !== window.parent || !e.data || e.data.type !== 'xp-data') return;
      data = e.data.data || {};
      draw();
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
