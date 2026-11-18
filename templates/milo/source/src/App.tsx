import { Suspense, lazy, useState } from 'react';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { CustomCursor } from './components/CustomCursor';
import { DescentSection } from './components/DescentSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { Navigation } from './components/Navigation';
import { ProjectExperience } from './components/ProjectExperience';
import { ProjectsSection } from './components/ProjectsSection';
import { ScrollProgress } from './components/ScrollProgress';
import { ServicesSection } from './components/ServicesSection';
import { Project } from './data/portfolioData';
import { on, useTheme, useXP } from './xp';

const OceanScene = lazy(() =>
  import('./components/OceanScene').then((mod) => ({ default: mod.OceanScene }))
);

export default function App() {
  const data = useXP();
  useTheme(data);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [inquiryContext, setInquiryContext] = useState<string | null>(null);

  return (
    <div className="app-shell">
      {data.motion?.cursor !== false && <CustomCursor />}
      {data.motion?.progress !== false && <ScrollProgress />}

      {data.ocean?.show !== false ? (
        <Suspense fallback={<div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none ocean-fallback" />}>
          <OceanScene />
        </Suspense>
      ) : (
        <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none ocean-fallback" />
      )}

      <Navigation onSelectProject={setSelectedProject} />

      <main>
        {on('hero', data) && <HeroSection />}
        {on('descent', data) && <DescentSection />}
        {on('about', data) && <AboutSection />}
        {on('services', data) && (
          <ServicesSection onSelectService={(serviceTitle) => setInquiryContext(serviceTitle)} />
        )}
        {on('projects', data) && <ProjectsSection onSelectProject={setSelectedProject} />}
        <div data-xp-extras="" className="relative z-30 bg-[var(--c-page)]" />
        {on('contact', data) && (
          <ContactSection
            inquiryContext={inquiryContext}
            onClearInquiryContext={() => setInquiryContext(null)}
          />
        )}
      </main>

      {on('footer', data) && <Footer />}

      <ProjectExperience
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onSelectProject={setSelectedProject}
        onInquire={(label) => setInquiryContext(label)}
      />
    </div>
  );
}
