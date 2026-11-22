import { useState } from 'react';
import { MotionConfig } from 'motion/react';
import { HeroSection } from './components/HeroSection';
import { MarqueeSection } from './components/MarqueeSection';
import { AboutSection } from './components/AboutSection';
import { ServicesSection } from './components/ServicesSection';
import { ProjectsSection } from './components/ProjectsSection';
import { ProjectModal } from './components/ProjectModal';
import { ContactModal } from './components/ContactModal';
import { type ProjectItem } from './data/portfolio';
import { fill, on, useTheme, useXP } from './xp';
import { CharacterSlot, hasEcho } from './character';

export default function App() {
  const data = useXP();
  useTheme(data);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [inquiryProject, setInquiryProject] = useState<string | null>(null);

  const openContact = (projectName?: string) => {
    setInquiryProject(projectName ?? null);
    setSelectedProject(null);
    setIsContactOpen(true);
  };

  return (
    <MotionConfig reducedMotion={data.motion?.animate === false ? 'always' : 'user'}>
      <main className="min-h-screen w-full bg-[var(--c-page)] text-[var(--c-text)]" style={{ overflowX: 'clip' }}>
        <HeroSection onOpenContact={() => openContact()} />
        {on('marquee', data) && <MarqueeSection />}
        {on('about', data) && <AboutSection onOpenContact={() => openContact()} />}
        {on('services', data) && <ServicesSection />}
        {on('projects', data) && <ProjectsSection onSelectProject={(project) => setSelectedProject(project)} />}
        <div data-xp-extras="" />
        {hasEcho(data) && (
          <div className="xp-echo" style={{ background: 'var(--c-page)' }}>
            <CharacterSlot data={data} slot="echo" />
          </div>
        )}
        {data.footer && <footer className="px-6 md:px-10 py-10 text-xs uppercase tracking-widest opacity-60 text-center">{fill(data.footer, data)}</footer>}
      </main>

      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} onInquire={(projectName) => openContact(projectName)} />
      <ContactModal isOpen={isContactOpen} initialProject={inquiryProject} onClose={() => setIsContactOpen(false)} />
    </MotionConfig>
  );
}
