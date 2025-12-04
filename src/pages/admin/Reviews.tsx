import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, Ban, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Reviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<any>(null);

  useEffect(() => {
    loadReviews();

    // Realtime subscription
    const channel = supabase
      .channel('reviews-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews'
      }, () => {
        loadReviews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const reviewsWithData = await Promise.all(
        (reviewsData || []).map(async (review) => {
          const [productData, profileData] = await Promise.all([
            supabase.from("products").select("name").eq("id", review.product_id).is("deleted_at", null).single(),
            supabase.from("profiles").select("full_name, email, reviews_blocked").eq("id", review.user_id).single(),
          ]);

          return {
            ...review,
            products: productData.data,
            profiles: profileData.data,
          };
        })
      );

      setReviews(reviewsWithData);
    } catch (error: any) {
      console.error("Error loading reviews:", error);
      toast.error("Error al cargar reseñas: " + (error.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const approveReview = async (id: string) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ is_approved: true })
        .eq("id", id);

      if (error) throw error;
      toast.success("Reseña aprobada");
      await loadReviews();
    } catch (error) {
      toast.error("Error al aprobar reseña");
    }
  };

  const rejectReview = async (id: string) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ is_approved: false })
        .eq("id", id);

      if (error) throw error;
      toast.success("Reseña rechazada");
      await loadReviews();
    } catch (error) {
      toast.error("Error al rechazar reseña");
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("¿Eliminar esta reseña permanentemente?")) return;
    
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Reseña eliminada");
      await loadReviews();
    } catch (error) {
      toast.error("Error al eliminar reseña");
    }
  };

  const updateReview = async () => {
    if (!editingReview) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          title: editingReview.title,
          comment: editingReview.comment,
          rating: editingReview.rating
        })
        .eq("id", editingReview.id);

      if (error) throw error;
      toast.success("Reseña actualizada");
      setEditingReview(null);
      await loadReviews();
    } catch (error) {
      toast.error("Error al actualizar reseña");
    }
  };

  const toggleUserReviewsBlock = async (userId: string, currentlyBlocked: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ reviews_blocked: !currentlyBlocked })
        .eq("id", userId);

      if (error) throw error;
      toast.success(currentlyBlocked ? "Usuario desbloqueado para reseñas" : "Usuario bloqueado para reseñas");
      await loadReviews();
    } catch (error) {
      toast.error("Error al cambiar estado de bloqueo");
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Moderación de Reseñas</h1>

      <Card>
        <CardHeader>
          <CardTitle>Reseñas de Productos</CardTitle>
          <CardDescription>Revisa y modera las reseñas enviadas por los clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Calificación</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Comentario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>{review.products?.name}</TableCell>
                  <TableCell>
                    <div>
                      <div>{review.profiles?.full_name}</div>
                      <div className="text-sm text-muted-foreground">{review.profiles?.email}</div>
                      {review.profiles?.reviews_blocked && (
                        <Badge variant="destructive" className="mt-1">Bloqueado</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < review.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{review.title}</TableCell>
                  <TableCell className="max-w-md truncate">{review.comment}</TableCell>
                  <TableCell>
                    {review.is_approved ? (
                      <Badge variant="default">Aprobada</Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {!review.is_approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveReview(review.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {review.is_approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectReview(review.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingReview(review)}
                          >
                            Editar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Reseña</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Título</Label>
                              <Input
                                value={editingReview?.title || ''}
                                onChange={(e) => setEditingReview({ ...editingReview, title: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Comentario</Label>
                              <Textarea
                                value={editingReview?.comment || ''}
                                onChange={(e) => setEditingReview({ ...editingReview, comment: e.target.value })}
                                rows={4}
                              />
                            </div>
                            <div>
                              <Label>Calificación</Label>
                              <select
                                className="w-full px-3 py-2 border rounded"
                                value={editingReview?.rating || 5}
                                onChange={(e) => setEditingReview({ ...editingReview, rating: parseInt(e.target.value) })}
                              >
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} estrellas</option>)}
                              </select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={updateReview}>Guardar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant={review.profiles?.reviews_blocked ? "outline" : "destructive"}
                        onClick={() => toggleUserReviewsBlock(review.user_id, review.profiles?.reviews_blocked)}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteReview(review.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
