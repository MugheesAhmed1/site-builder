import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SHEET_URL, setContent, setSheetUrl } from './strideData';
import { drawSheet } from './sheetArt';
import { useTheme, useXP } from './xp';
import './index.css';

/**
 * The page runs a 3D engine and timelines that read the flavours, steps and pack once when they
 * start. Words elsewhere update in place; when anything the engine reads changes, the page restarts.
 */
function Root() {
  const data = useXP();
  useTheme(data);
  setContent(data);
  // With no sheet picture, or one that fails to load, the packs are drawn from the brand and flavours.
  const wanted = SHEET_URL;
  const [failed, setFailed] = useState('');
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady(true));
  }, []);
  useEffect(() => {
    if (!wanted) return;
    const img = new Image();
    img.onerror = () => setFailed(wanted);
    img.src = wanted;
    return () => {
      img.onerror = null;
    };
  }, [wanted]);
  const drawn = !wanted || failed === wanted;
  const drawKey = JSON.stringify([data.flavours, data.sheet, data.pack, data.brand?.name, data.theme?.fonts]);
  const [drawnUrl, setDrawnUrl] = useState('');
  useEffect(() => {
    if (!drawn) return;
    let live = true;
    let made = '';
    drawSheet().then((u) => {
      made = u;
      if (live) setDrawnUrl(u);
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      live = false;
      // keep the old picture until the new one is ready, then let it go
      if (made) window.setTimeout(() => URL.revokeObjectURL(made), 4000);
    };
  }, [drawn, drawKey, fontsReady]);
  if (drawn) setSheetUrl(drawnUrl);
  document.documentElement.style.setProperty('--sheet', SHEET_URL ? `url("${SHEET_URL.replace(/"/g, '%22')}")` : 'none');
  const engineKey = JSON.stringify([data.flavours, data.sheet, data.inside, data.pack, data.theme?.fonts, data.intro?.video, data.brand, drawn && drawnUrl]);
  return (
    <>
      <App key={engineKey} />
      <div data-xp-extras="" className="xp-extras" />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
