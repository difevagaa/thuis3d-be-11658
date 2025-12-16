import { useTranslation } from "react-i18next";
import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";

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
      {/* Render all content from Page Builder Sections */}
      <SectionRenderer sections={pageBuilderSections} />

      {/* Show message if no sections configured */}
      {pageBuilderSections.length === 0 && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("home:fallback.title")}</h2>
          <p className="text-muted-foreground mb-8">
            {t("home:fallback.description")}
          </p>
        </div>
      )}
    </div>
  );
};
export default Home;