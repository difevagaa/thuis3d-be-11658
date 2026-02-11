import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ReactNode } from "react";

interface DeleteConfirmDialogProps {
  title: string;
  description?: string;
  onConfirm: () => void;
  trigger?: ReactNode;
  itemName?: string;
  actionText?: string;
  canRestore?: boolean;
}

export function DeleteConfirmDialog({
  title,
  description,
  onConfirm,
  trigger,
  itemName,
  actionText = "Eliminar",
  canRestore = true,
}: DeleteConfirmDialogProps) {
  const defaultDescription = canRestore
    ? `${itemName ? `"${itemName}" ` : "Este elemento "}se moverá a la papelera y podrá ser restaurado más tarde.`
    : `Esta acción no se puede deshacer. ${itemName ? `"${itemName}" ` : "El elemento "}será eliminado permanentemente.`;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            {actionText}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
