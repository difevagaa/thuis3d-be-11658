import { Share2, Link2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareProductProps {
  productName: string;
  productUrl?: string;
}

export function ShareProduct({ productName, productUrl }: ShareProductProps) {
  const { t } = useTranslation('products');
  const url = productUrl || window.location.href;
  const text = `${productName} - ${url}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url });
      } catch {
        // User cancelled
      }
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast.success(t('share.copied'));
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Use native share on mobile if available
  if (navigator.share) {
    return (
      <Button variant="outline" size="sm" onClick={handleNativeShare} className="gap-2">
        <Share2 className="h-4 w-4" />
        {t('share.title')}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          {t('share.title')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={shareWhatsApp}>
          <MessageCircle className="mr-2 h-4 w-4 text-primary" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareFacebook}>
          <Share2 className="mr-2 h-4 w-4 text-primary" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareTwitter}>
          <Share2 className="mr-2 h-4 w-4" />
          X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink}>
          <Link2 className="mr-2 h-4 w-4" />
          {t('share.copyLink')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
