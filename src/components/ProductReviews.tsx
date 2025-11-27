import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { ReviewItem } from "@/components/ReviewItem";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  is_approved: boolean;
  profiles: {
    full_name: string | null;
  } | null;
}

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { t } = useTranslation('reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userHasPurchased, setUserHasPurchased] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: "",
    comment: "",
  });

  const loadReviews = useCallback(async () => {
    try {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately to avoid join issues
      const profilesPromises = (reviewsData || []).map(async (review) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", review.user_id)
          .single();
        
        return {
          ...review,
          profiles: profileData,
        };
      });

      const reviewsWithProfiles = await Promise.all(profilesPromises);
      setReviews(reviewsWithProfiles as Review[]);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userReviewData = reviewsWithProfiles.find(r => r.user_id === user.id);
        setUserReview(userReviewData as Review || null);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const checkUserPurchase = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is blocked from reviews
      const { data: profileData } = await supabase
        .from("profiles")
        .select("reviews_blocked")
        .eq("id", user.id)
        .single();

      if (profileData?.reviews_blocked) {
        setUserHasPurchased(false);
        return;
      }

      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          orders!inner(user_id, payment_status)
        `)
        .eq("product_id", productId)
        .eq("orders.user_id", user.id)
        .eq("orders.payment_status", "paid")
        .limit(1);

      if (error) throw error;
      setUserHasPurchased((data?.length || 0) > 0);
    } catch (error) {
      console.error("Error checking purchase:", error);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
    checkUserPurchase();
  }, [loadReviews, checkUserPurchase]);

  const handleSubmitReview = async () => {
    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('loginRequired'));
        return;
      }

      if (!userHasPurchased) {
        toast.error(t('purchaseRequired'));
        return;
      }

      // Comentario y título son opcionales, solo la calificación es obligatoria
      const reviewData = {
        product_id: productId,
        user_id: user.id,
        rating: newReview.rating,
        title: newReview.title.trim() || null,
        comment: newReview.comment.trim() || null,
        is_approved: false,
      };

      if (userReview) {
        const { error } = await supabase
          .from("reviews")
          .update(reviewData)
          .eq("id", userReview.id);

        if (error) throw error;
        toast.success(t('reviewUpdated'));
      } else {
        const { error } = await supabase
          .from("reviews")
          .insert(reviewData);

        if (error) throw error;
        toast.success(t('reviewSubmitted'));
      }

      setNewReview({ rating: 5, title: "", comment: "" });
      loadReviews();
    } catch (error: any) {
      toast.error(t('error'));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? "fill-warning text-warning"
                : "text-muted-foreground/30"
            } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onClick={() => interactive && onRatingChange?.(star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          {reviews.length > 0 ? (
            <div className="flex items-center gap-2 mt-2">
              {renderStars(Math.round(averageRating))}
              <span className="text-lg font-semibold">
                {averageRating.toFixed(1)} {t('averageRating')}
              </span>
              <span className="text-muted-foreground">
                ({reviews.length} {reviews.length === 1 ? t('reviewCount_one') : t('reviewCount_other')})
              </span>
            </div>
          ) : (
            <CardDescription>{t('noReviews')}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </CardContent>
      </Card>

      {userHasPurchased && (
        <Card>
          <CardHeader>
            <CardTitle>{userReview ? t('editReview') : t('writeReview')}</CardTitle>
            <CardDescription>
              {t('shareExperience')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('rating')}</Label>
              {renderStars(newReview.rating, true, (rating) =>
                setNewReview({ ...newReview, rating })
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-title">{t('reviewTitle')}</Label>
              <Input
                id="review-title"
                placeholder={t('reviewTitlePlaceholder')}
                value={newReview.title}
                onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-comment">{t('comment')}</Label>
              <Textarea
                id="review-comment"
                placeholder={t('commentPlaceholder')}
                rows={4}
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              />
            </div>

            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? t('submitting') : userReview ? t('updateReview') : t('submitReview')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
