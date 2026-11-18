import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SHEET_URL, setContent } from './strideData';
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
  document.documentElement.style.setProperty('--sheet', SHEET_URL ? `url("${SHEET_URL.replace(/"/g, '%22')}")` : 'none');
  const engineKey = JSON.stringify([data.flavours, data.sheet, data.inside, data.pack, data.theme?.fonts, data.intro?.video, data.brand]);
  return (
    <>
      <App key={engineKey} />
      <div data-xp-extras="" className="xp-extras" />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
