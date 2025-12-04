import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromoBannerProps {
  title: string;
  description: string;
  linkText: string;
  linkUrl: string;
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: string;
}

export const PromoBanner = ({
  title,
  description,
  linkText,
  linkUrl,
  backgroundImage,
  backgroundColor = "bg-gradient-to-r from-primary/10 to-accent/10",
  textColor = "text-foreground"
}: PromoBannerProps) => {
  return (
    <div
      className={`relative rounded-lg overflow-hidden ${!backgroundImage && backgroundColor}`}
      style={
        backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {backgroundImage && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
      )}
      
      <div className="relative p-6 md:p-8 lg:p-12">
        <div className="max-w-2xl">
          <h3 className={`text-2xl md:text-3xl lg:text-4xl font-bold mb-3 ${backgroundImage ? 'text-white' : textColor}`}>
            {title}
          </h3>
          <p className={`text-base md:text-lg mb-6 ${backgroundImage ? 'text-white/90' : 'text-muted-foreground'}`}>
            {description}
          </p>
          <Link to={linkUrl}>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              {linkText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

interface PromoGridProps {
  items: {
    title: string;
    image: string;
    link: string;
  }[];
}

export const PromoGrid = ({ items }: PromoGridProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <Link
          key={index}
          to={item.link}
          className="group relative aspect-square rounded-lg overflow-hidden bg-muted hover:shadow-lg transition-all"
        >
          {item.image && (
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h4 className="text-white font-semibold text-sm md:text-base">
              {item.title}
            </h4>
          </div>
        </Link>
      ))}
    </div>
  );
};
