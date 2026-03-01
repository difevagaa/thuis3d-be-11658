import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  is_approved: boolean;
  image_urls?: string[] | null;
  profiles: {
    full_name: string | null;
  } | null;
}

interface ReviewItemProps {
  review: Review;
}

export function ReviewItem({ review }: ReviewItemProps) {
  const { t } = useTranslation('reviews');
  const { content: translatedReview } = useTranslatedContent(
    'reviews',
    review.id,
    ['title', 'comment'],
    review
  );

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? "fill-warning text-warning"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="border-b pb-4 last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold">{review.profiles?.full_name || t('user')}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(review.created_at).toLocaleDateString()}
          </p>
        </div>
        {renderStars(review.rating)}
      </div>
      {translatedReview.title && (
        <h4 className="font-medium mb-1">{translatedReview.title}</h4>
      )}
      {translatedReview.comment && (
        <p className="text-muted-foreground">{translatedReview.comment}</p>
      )}
      {review.image_urls && review.image_urls.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {review.image_urls.map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt="" className="w-16 h-16 rounded border object-cover hover:opacity-80 transition-opacity" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
