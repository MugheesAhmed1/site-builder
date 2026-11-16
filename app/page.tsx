import Link from "next/link";
import Icon from "@/components/Icon";
import DocBand from "@/components/DocBand";
import { LazyCategories } from "@/components/home/LazySections";
import DesignWall from "@/components/home/DesignWall";
import Engine from "@/components/home/Engine";
import HomeJourney from "@/components/home/HomeJourney";
import IntensityDemo from "@/components/home/IntensityDemo";
import HomeNav from "@/components/home/HomeNav";
import { ReadDemo, ShuffleDemo, type Swatch } from "@/components/home/HowDemos";
import LiveDemo from "@/components/home/LiveDemo";
import { CATEGORIES } from "@/lib/categories";
import { LIBRARY } from "@/lib/designs";
import { ROLES } from "@/lib/fit";
import { CHARACTERS as CREATURES, ENVIRONMENTS } from "@/template/src/story.js";
import { palette } from "@/template/src/theme.js";

// The home page. It is rendered on the server (words, numbers and structure arrive as
// plain HTML) and only the pieces that move or react are client components.

function swatch(d: (typeof LIBRARY)[number]): Swatch {
  const dark = d.mode === "dark";
  const p = palette(d, dark ? "dark" : "light");
  return { id: d.id, preset: d.preset, display: d.fonts.display, body: d.fonts.body, radius: d.radius, dark, bg: p.bg, text: p.text, border: p.border, accent: p.accent, onAccent: p.onAccent };
}

const FAQ = [
  ["Is it really free?", "Yes. There is no account, no trial and no monthly fee. The site you download is plain files that you own, and the free plans of hosts such as Netlify, Cloudflare Pages and GitHub Pages are enough to put it online."],
  ["Is there AI in it?", "Only if you want it. Every site is written by rules from your own answers, so it works instantly and never invents facts. When the server has a free Google Gemini key, the AI polish panel can also rewrite your words and direct your 3D journey. You review every change before it lands."],
  ["Where does my information go?", "Your sites are saved inside this browser, and a résumé or document you drop in is read here too. The only thing that ever leaves is the words you choose to send to AI polish, and never links, emails, phone numbers or prices. Use Save a backup to move a site to another device."],
  ["What exactly do I get?", "A zip with the finished site: one page, its pictures, a browser icon, a share picture and search tags. Unzip it and it opens. Developers can also download the same site as a React and Vite project."],
  ["Can I change it later?", "Open it again here, change anything, and download again. You can also edit every word and colour in a text editor: they live in one readable file inside the download."],
  ["Will the 3D journey slow my site down?", "No. The 3D world loads only when a visitor reaches it, pauses when it is off screen, uses fewer particles on phones, and is replaced by a still picture for people who turn motion down. Lower the intensity dial for a lighter site."],
  ["Will it work on phones and for screen readers?", "Every site is responsive, passes WCAG AA colour contrast, respects reduced motion and ships with the tags search engines and link previews look for."],
];

export default function Home() {
  // A spread across the library: every 37th system gives a mix of moods, light and dark.
  const spread = LIBRARY.filter((_, i) => i % 37 === 3).slice(0, 12).map(swatch);

  return (
    <div className="home-root">
      <HomeNav />
      <main>
        <HomeJourney />

        <section className="hsec" id="dial" aria-labelledby="dial-title">
          <header className="hsec-head">
            <span className="hsec-kicker mono">The intensity dial</span>
            <h2 id="dial-title">
              Calm or <em className="serif-i">completely wild.</em> You choose.
            </h2>
            <p>One slider sets how much your site moves. Low numbers keep it quiet and fast. Turn it up for pinned scenes, particles and camera moves, and at 10 your visitors fly through a living world.</p>
          </header>
          <IntensityDemo />
        </section>

        <section className="hsec" id="engine" aria-labelledby="engine-title">
          <header className="hsec-head">
            <span className="hsec-kicker mono">The animation engine</span>
            <h2 id="engine-title">
              Motion described as data, <em className="serif-i">rendered as a world.</em>
            </h2>
            <p>Your words go to a director that picks a scene, a character, how the camera moves and how sections arrive. A renderer turns that plan into a real React site, so every choice stays editable.</p>
          </header>
          <Engine />
          <ul className="prim">
            <li>
              <b>Worlds</b>
              {ENVIRONMENTS.map((e) => (
                <span key={e.id} className="prim-on">{e.label}</span>
              ))}
              <span>City, desert, clouds soon</span>
            </li>
            <li>
              <b>Characters</b>
              {CREATURES.map((c) => (
                <span key={c.id} className="prim-on">{c.label}</span>
              ))}
              <span>Fox, robot, astronaut soon</span>
            </li>
            <li>
              <b>Behaviours</b>
              {["Looks at the cursor", "Answers a tap", "Crosses the screen", "Dances to sound"].map((x) => (
                <span key={x} className="prim-on">{x}</span>
              ))}
            </li>
            <li>
              <b>Sections</b>
              {["Rise", "Curtain", "Zoom", "Tilt", "Blur", "Slide", "Stack"].map((x) => (
                <span key={x} className="prim-on">{x}</span>
              ))}
            </li>
          </ul>
        </section>

        <section className="hsec" id="demo" aria-labelledby="demo-title">
          <header className="hsec-head">
            <h2 id="demo-title">
              One line in. <em className="serif-i">A whole site</em> out.
            </h2>
            <p>These are not screenshots. Each one is a real site the builder made from the line above it, running live. Scroll inside, switch to phone, try dark.</p>
          </header>
          <LiveDemo />
        </section>

        <section className="hsec" id="how" aria-labelledby="how-title">
          <header className="hsec-head">
            <h2 id="how-title">
              Three moves, <em className="serif-i">no blank page.</em>
            </h2>
            <p>You never start from an empty canvas. The site exists from the first second, and everything after that is choosing.</p>
          </header>
          <ol className="how">
            <li className="how-step">
              <div className="how-text">
                <span className="how-n mono">1</span>
                <h3>Say it</h3>
                <p>Type what you would tell a friend. Simple rules work out whether it is a business or a person, which kind, and pick up a name and a city.</p>
              </div>
              <ReadDemo />
            </li>
            <li className="how-step">
              <div className="how-text">
                <span className="how-n mono">2</span>
                <h3>Shape it</h3>
                <p>Your site opens already written, with a design system made for you. Shuffle it, swap the opening scene, pick how it moves, click any word to change it.</p>
              </div>
              <ShuffleDemo designs={spread} />
            </li>
            <li className="how-step">
              <div className="how-text">
                <span className="how-n mono">3</span>
                <h3>Own it</h3>
                <p>Download one folder and drop it onto a free host. No account here, no lock-in, no monthly bill. The files are yours for good.</p>
              </div>
              <div className="how-demo">
                <ul className="how-files mono">
                  <li>
                    <span>index.html</span>
                    <span>your page</span>
                  </li>
                  <li>
                    <span>site-data.js</span>
                    <span>every word and colour</span>
                  </li>
                  <li>
                    <span>site.js · site.css</span>
                    <span>motion and style</span>
                  </li>
                  <li>
                    <span>images/</span>
                    <span>your pictures</span>
                  </li>
                  <li>
                    <span>favicon · share.png</span>
                    <span>icon and link preview</span>
                  </li>
                </ul>
              </div>
            </li>
          </ol>
        </section>

        <section className="hsec" id="designs" aria-labelledby="designs-title">
          <header className="hsec-head">
            <h2 id="designs-title">
              {LIBRARY.length} design systems. <em className="serif-i">One is made for you.</em>
            </h2>
            <p>Each pairs real typefaces with one accent, tinted neutrals, a corner shape and a layout, in light and dark, with contrast checked. Yours is seeded from your name and tone, then you can shuffle, remix one part or lock what you like.</p>
          </header>
          <DesignWall designs={spread} />
        </section>

        <section className="hsec" id="categories" aria-labelledby="cat-title">
          <header className="hsec-head">
            <h2 id="cat-title">
              Made for <em className="serif-i">your kind of work.</em>
            </h2>
            <p>
              {CATEGORIES.length} kinds of business and {ROLES.length} roles, each with its own questions, starting words, scenes, characters and animation. Pick yours and a site opens.
            </p>
          </header>
          <LazyCategories />
        </section>

        <section className="hsec" aria-label="Start from a document">
          <DocBand />
        </section>

        <section className="hsec" id="yours" aria-labelledby="yours-title">
          <header className="hsec-head">
            <h2 id="yours-title">
              Built to be <em className="serif-i">kept.</em>
            </h2>
          </header>
          <ul className="bento">
            <li className="bento-a">
              <Icon name="shield" size={22} />
              <h3>Private by design</h3>
              <p>Your sites live in this browser. There is no account and no tracking of what you build, and only words you choose to polish are ever sent.</p>
            </li>
            <li className="bento-b">
              <Icon name="bolt" size={22} />
              <h3>Instant, with AI only when you ask</h3>
              <p>Rules write the page from your answers, so it appears as you type. Free Gemini polish is one click away, and you approve every word.</p>
            </li>
            <li className="bento-c">
              <Icon name="edit" size={22} />
              <h3>Click anything to change it</h3>
              <p>Edit words and pictures right on the page. Change an answer later and the page follows, keeping what you rewrote by hand.</p>
            </li>
            <li className="bento-d">
              <Icon name="globe" size={22} />
              <h3>Ready for search and sharing</h3>
              <p>Titles, link previews, business data for search engines, a favicon and a share picture are in every download.</p>
            </li>
            <li className="bento-e">
              <Icon name="heart" size={22} />
              <h3>Works for everyone</h3>
              <p>Responsive, centred and keyboard friendly, AA contrast in light and dark, and a still version for people who turn motion down.</p>
            </li>
            <li className="bento-f">
              <Icon name="code" size={22} />
              <h3>Source included</h3>
              <p>Prefer code? Take the same site as a React and Vite project, with every setting in one JSON file.</p>
            </li>
          </ul>
        </section>

        <section className="hsec hsec-narrow" id="faq" aria-labelledby="faq-title">
          <header className="hsec-head">
            <h2 id="faq-title">Fair questions</h2>
          </header>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Icon name="plus" size={18} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="endcta" aria-labelledby="end-title">
          <div className="endcta-glow" aria-hidden="true" />
          <div className="endcta-card">
            <h2 id="end-title">
              Your site is <em className="serif-i">one line</em> away.
            </h2>
            <p>It takes less time than reading this page did.</p>
            <div className="row wrap" style={{ justifyContent: "center" }}>
              <a href="#start" className="btn btn-primary">
                Start building
                <Icon name="arrow" size={16} />
              </a>
              <Link href="/sites" className="btn endcta-ghost">
                Your sites
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="hfoot">
        <div className="hfoot-top">
          <p>Site Builder turns one line into a finished, animated website you own. Free, private, with optional AI polish.</p>
          <nav aria-label="Footer">
            <a href="#demo">Examples</a>
            <a href="#how">How it works</a>
            <a href="#dial">Intensity</a>
            <a href="#engine">Engine</a>
            <a href="#designs">Design systems</a>
            <a href="#faq">Questions</a>
            <Link href="/sites">Your sites</Link>
          </nav>
        </div>
        <p className="hfoot-word" aria-hidden="true">
          Site Builder
        </p>
        <p className="hfoot-fine">3D by three.js and React Three Fiber (MIT). Motion by Motion and Lenis (MIT). Emoji art by Microsoft Fluent (MIT) and Google Noto (Apache 2.0).</p>
      </footer>
    </div>
  );
}
