import Link from "next/link";
import Icon from "@/components/Icon";
import { CharacterHero, HomeCharacterProvider } from "@/components/home/HomeCharacter";
import HomeJourney from "@/components/home/HomeJourney";
import HomeNav from "@/components/home/HomeNav";
import { LazyGallery } from "@/components/home/LazySections";
import ModelMarquee from "@/components/home/ModelMarquee";
import PhotoStory from "@/components/home/PhotoStory";
import type { Showcase } from "@/components/home/showcase";
import { TEMPLATES } from "@/lib/templates";
import { ASSETS, isShippable, type AssetRecord } from "@/packages/asset-library";

// The home page (docs/CHARACTER-JOURNEY.md). It is built the way the sites it makes are built:
// one 3D character is the star, and the whole page takes its colours from it. Pick another
// character, in the opening or from the library further down, and the page follows. Everything
// that is only words is rendered on the server; the pieces that move or react are client parts.

const MODELS = ASSETS.filter((a) => a.type === "3d" && isShippable(a));

/** The business a model most suits, so its design draws the same trade colour the journey would. */
const BUSINESS: Record<string, string> = { character: "agency", vehicle: "product", product: "shop", prop: "shop", nature: "hotel", architecture: "agency", environment: "hotel", abstract: "agency" };

// Two rows for the library river: models that need no credit line, characters and products first.
// (The racer is left out: its livery is too close to a real team's.)
const RIVER = MODELS.filter((a) => !a.license.attributionRequired && a.id !== "vehicle-formula-001" && ["character", "vehicle", "product", "prop", "nature", "abstract"].includes(a.category));
const PICKED = ["character", "abstract", "vehicle", "product", "nature", "prop"].flatMap((cat) => RIVER.filter((a) => a.category === cat));
const asShowcase = (a: AssetRecord): Showcase => ({ id: a.id, name: a.name, asset: a.asset, preview: a.preview, line: "", business: BUSINESS[a.category] || "agency", words: [...a.style, ...a.tags.slice(0, 4)] });
const ROWS = [PICKED.filter((_, n) => n % 2 === 0).slice(0, 22).map(asShowcase), PICKED.filter((_, n) => n % 2 === 1).slice(0, 22).map(asShowcase)];

const FAQ = [
  ["Is it really free?", "Yes. There is no account, no trial and no monthly fee. The questions are asked by free AI models, the 3D models are cleared for commercial use, and the site you download is plain files you own. The free plans of hosts such as Netlify, Cloudflare Pages and GitHub Pages are enough to put it online."],
  ["How does it work?", "Say in one line what you are building. A short chat asks who it is for, how it should feel and what it needs. You pick the star, a 3D character from the library or one made from your photo, and its colours become five design systems to choose from. Then you see every template as your site, choose one or start a new one, and change anything before you download."],
  ["Can I use my own photo or 3D model?", "Yes. Upload a GLB model, or a photo of yourself, your product, your pet or your logo. The photo is cut out right in your browser and made into a standee or a soft 3D shape. If you choose AI sculpt, the cut-out is sent to a free AI vision model that reads it into parts to build in 3D."],
  ["Where does my information go?", "Your sites, pictures and models are saved in this browser. The line you type and your answers go to a free AI model so it can ask its questions and write your words; if it is busy, simple rules in your browser do it instead. A photo stays on your device unless you choose AI sculpt. To move sites to another device, back them up from Your sites."],
  ["What exactly do I get?", "A zip with the finished site: the page, its 3D model and pictures, a browser icon, a share picture and search tags. Unzip it and it opens. You can also download the source, with every word, colour and setting in one readable file."],
  ["Will the 3D slow my site down?", "No. The words and a still picture of the model arrive first, and three.js loads once the page is quiet. It draws fewer pixels on small screens, pauses when the model is off screen, and holds still for people who turn motion down."],
  ["Will it work on phones and for screen readers?", "Every site is responsive, checks its colours for WCAG AA contrast in light and dark, respects reduced motion, describes its 3D model for screen readers and ships with the tags search engines and link previews look for."],
];

export default function Home() {
  return (
    <HomeCharacterProvider className="home-root">
      <HomeNav />
      <main>
        <CharacterHero />

        <section className="hsec" id="journey" aria-labelledby="journey-title">
          <header className="hsec-head">
            <span className="hsec-kicker mono">How it works</span>
            <h2 id="journey-title">
              One line in. <em className="serif-i">A site built around its star.</em>
            </h2>
            <p>Six steps, the same ones you will take. The pictures use the character above, so pick another one and they change with it.</p>
          </header>
          <HomeJourney />
        </section>

        <section className="hsec" id="photo" aria-labelledby="photo-title">
          <header className="hsec-head">
            <span className="hsec-kicker mono">Photo to 3D</span>
            <h2 id="photo-title">
              Or make the star <em className="serif-i">from your photo.</em>
            </h2>
            <p>For a portfolio, the star can be you. Upload a picture and it is cut out right in your browser, made into a 3D model, and the whole site is designed around it.</p>
          </header>
          <PhotoStory />
        </section>

        <section className="hsec" id="models" aria-labelledby="models-title">
          <header className="hsec-head">
            <span className="hsec-kicker mono">3D library</span>
            <h2 id="models-title">
              {MODELS.length} models, <em className="serif-i">ready to star.</em>
            </h2>
            <p>Characters, animals, vehicles, products and props, each one checked and cleared for commercial use, with credits added for you where a licence asks. Tap one to make it this page&apos;s star.</p>
          </header>
          <ModelMarquee rows={ROWS} />
          <p className="hm-more">
            <Link href="/library">
              Browse the whole library
              <Icon name="arrow" size={16} />
            </Link>
          </p>
        </section>

        <section className="hsec" id="gallery" aria-labelledby="gallery-title">
          <header className="hsec-head">
            <span className="hsec-kicker mono">Template library</span>
            <h2 id="gallery-title">
              {TEMPLATES.length} templates. <em className="serif-i">Every one runs live.</em>
            </h2>
            <p>Not screenshots: each card runs the whole site. In the journey every one is shown with your words, your colours and your character, or you start a new one built around it.</p>
          </header>
          <LazyGallery />
        </section>

        <section className="hsec" id="yours" aria-labelledby="yours-title">
          <header className="hsec-head">
            <h2 id="yours-title">
              Built to be <em className="serif-i">kept.</em>
            </h2>
          </header>
          <ul className="bento">
            <li className="bento-a">
              <Icon name="sparkle" size={22} />
              <h3>One character, one site</h3>
              <p>Accent, stage, type, corners and motion are all drawn from the model, so nothing on the page fights it. Every pairing is checked for contrast.</p>
            </li>
            <li className="bento-b">
              <Icon name="shield" size={22} />
              <h3>Private by design</h3>
              <p>Your sites, photos and models live in this browser. There is no account and no tracking of what you build.</p>
            </li>
            <li className="bento-c">
              <Icon name="edit" size={22} />
              <h3>Change anything</h3>
              <p>Every word, picture, colour, section and the 3D model itself can be changed in the studio, and you see it at once.</p>
            </li>
            <li className="bento-d">
              <Icon name="globe" size={22} />
              <h3>Ready for search and sharing</h3>
              <p>Titles, link previews, business data for search engines, a favicon and a share picture are in every download.</p>
            </li>
            <li className="bento-e">
              <Icon name="heart" size={22} />
              <h3>Works for everyone</h3>
              <p>Responsive and keyboard friendly, AA contrast in light and dark, and a still picture of the model for people who turn motion down.</p>
            </li>
            <li className="bento-f">
              <Icon name="code" size={22} />
              <h3>Yours to keep</h3>
              <p>Download the finished site, or its source with every setting in one JSON file. No lock-in and no monthly bill.</p>
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
              Build a website <em className="serif-i">around your character.</em>
            </h2>
            <p>One line is all it takes to start.</p>
            <div className="row wrap" style={{ justifyContent: "center" }}>
              <a href="#start" className="btn btn-primary">
                Start with one line
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
          <p>Site Builder makes a website around a 3D character. Say what you are building, pick the star, and every part of the site follows it.</p>
          <nav aria-label="Footer">
            <a href="#journey">How it works</a>
            <a href="#photo">Photo to 3D</a>
            <Link href="/library">3D library</Link>
            <Link href="/templates">Templates</Link>
            <Link href="/lab">Experience Lab</Link>
            <a href="#faq">Questions</a>
            <Link href="/sites">Your sites</Link>
          </nav>
        </div>
        <p className="hfoot-word" aria-hidden="true">
          Site Builder
        </p>
        <p className="hfoot-fine">
          Every template and experience is original code. 3D by three.js and React Three Fiber (MIT). Photo cut-outs by MediaPipe (Apache-2.0). Photo to 3D follows the img2threejs method (Apache-2.0). Motion by Motion and Lenis (MIT). The portrait above is an AI picture made for this site.
        </p>
      </footer>
    </HomeCharacterProvider>
  );
}
