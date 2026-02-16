import { useTranslation } from "react-i18next";
import { SectionRenderer } from "@/components/page-builder/SectionRenderer";
import { usePageSections } from "@/hooks/usePageSections";
import { ScrollRevealSection } from "@/components/ScrollRevealSection";

const Home = () => {
  const { t } = useTranslation(["home", "common"]);

  // Load page builder sections for home page
  const { sections: pageBuilderSections, loading } = usePageSections("home");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Render all content from Page Builder Sections with scroll reveal */}
      {pageBuilderSections.length > 0 ? (
        pageBuilderSections.map((section, index) => (
          <ScrollRevealSection
            key={section.id}
            delay={index === 0 ? 0 : 80}
          >
            <SectionRenderer sections={[section]} />
          </ScrollRevealSection>
        ))
      ) : (
        <ScrollRevealSection>
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
            <h2 className="text-display-lg mb-6">{t("home:fallback.title")}</h2>
            <p className="text-subtitle max-w-2xl mx-auto">
              {t("home:fallback.description")}
            </p>
          </div>
        </ScrollRevealSection>
      )}
    </div>
  );
};
export default Home;