import { ReactNode } from "react";
import { SectionRenderer } from "@/components/page-builder/SectionRenderer";
import { usePageSections } from "@/hooks/usePageSections";
import { ScrollRevealSection } from "@/components/ScrollRevealSection";

interface PageWithSectionsProps {
  pageKey: string;
  children: ReactNode;
}

/**
 * Wraps a page with its page builder sections rendered above the main content.
 * Sections are loaded from the page_builder_sections table.
 */
export function PageWithSections({ pageKey, children }: PageWithSectionsProps) {
  const { sections, loading } = usePageSections(pageKey);

  return (
    <div className="min-h-screen">
      {/* Render page builder sections */}
      {!loading && sections.length > 0 && (
        sections.map((section, index) => (
          <ScrollRevealSection
            key={section.id}
            delay={index === 0 ? 0 : 80}
            variant={index === 0 ? 'fade-in' : 'fade-up'}
          >
            <SectionRenderer sections={[section]} />
          </ScrollRevealSection>
        ))
      )}
      {/* Main page content */}
      <ScrollRevealSection variant="fade-up" delay={sections.length > 0 ? 100 : 0}>
        {children}
      </ScrollRevealSection>
    </div>
  );
}