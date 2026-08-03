"use client";

import { useRouter } from "next/navigation";
import { ApplicationForm } from "@/components/applications/application-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdminApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminApplicationForm({
  open,
  onOpenChange,
}: AdminApplicationFormProps) {
  const router = useRouter();

  const handleSuccess = (applicationId: string) => {
    onOpenChange(false);
    router.push(`/admin/applications/${applicationId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud Asistida</DialogTitle>
          <DialogDescription>
            Crea una nueva solicitud de crédito para un cliente
          </DialogDescription>
        </DialogHeader>
        <ApplicationForm mode="admin" onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}

