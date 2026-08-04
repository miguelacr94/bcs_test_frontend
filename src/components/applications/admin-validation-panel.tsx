"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  applicationRepository,
  ApplicationStatus,
} from "@/infrastructure/repositories";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  CheckCircle2,
  Shield,
  ClipboardList,
  Send,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useParams } from "next/navigation";

export function AdminValidationPanel({ application }: { application: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const id = params.id as string;
  
  const [ref1Name, setRef1Name] = useState("");
  const [ref1Phone, setRef1Phone] = useState("");
  const [ref1Rel, setRef1Rel] = useState("");

  // Estado para los diálogos de confirmación de finalización
  const [finalizeDialog, setFinalizeDialog] = useState<{
    open: boolean;
    withDisbursement: boolean;
  }>({ open: false, withDisbursement: true });

  const validateMutation = useMutation({
    mutationFn: (data: any) =>
      applicationRepository.validate(id, data, "Asistido"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["application", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["application-events", id],
      });
      toast({
        title: "Validación guardada",
        description: "Referencias familiares guardadas exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al validar",
        description:
          error.response?.data?.message || "No se pudo guardar la validación.",
        variant: "destructive",
      });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: (withDisbursement: boolean) =>
      applicationRepository.finalize(id, withDisbursement, "Asistido"),
    onSuccess: (data: any, variables: boolean) => {
      queryClient.invalidateQueries({
        queryKey: ["application", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["application-events", id],
      });
      toast({
        title: "Solicitud Finalizada",
        description: variables
          ? "Finalizada con desembolso."
          : "Finalizada sin desembolso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al finalizar",
        description:
          error.response?.data?.message || "No se pudo finalizar la solicitud.",
        variant: "destructive",
      });
    },
  });

  const hasValidationData = !!application.validationData;
  const isFinalized = application.status === ApplicationStatus.FINALIZED;
  const isAbandoned = application.status === ApplicationStatus.ABANDONED;

  if (isFinalized) {
    return (
      <Card className="border border-emerald-200 bg-emerald-50/30">
        <CardContent className="p-6 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-emerald-800">Solicitud Finalizada</h3>
          <p className="text-sm text-emerald-600">
            El proceso de esta solicitud ha concluido.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isAbandoned) {
    return (
      <Card className="border border-rose-200 bg-rose-50/30">
        <CardContent className="p-6 text-center space-y-2">
          <h3 className="font-bold text-rose-800">Solicitud Abandonada</h3>
          <p className="text-sm text-rose-600">
            El cliente abandonó el proceso.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (application.status !== ApplicationStatus.PENDING_VALIDATION) {
    return (
      <Card className="border border-border/30">
        <CardContent className="p-6 text-center space-y-2">
          <h3 className="font-bold text-slate-800">Datos adicionales</h3>
          <p className="text-sm text-slate-600">
            La solicitud aún no está en pendiente de validación.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="border border-border/30">
          <CardHeader className="bg-slate-50/50 border-b border-border/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#0066cc]" /> Validación de
              Referencias
            </CardTitle>
            <CardDescription>
              Completa la validación para permitir la finalización de la
              solicitud.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nombre Referencia</Label>
                <Input
                  value={
                    hasValidationData
                      ? application.validationData.familyReference1?.name
                      : ref1Name
                  }
                  onChange={(e) => setRef1Name(e.target.value)}
                  disabled={hasValidationData || validateMutation.isPending}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={
                    hasValidationData
                      ? application.validationData.familyReference1?.phone
                      : ref1Phone
                  }
                  onChange={(e) => setRef1Phone(e.target.value)}
                  disabled={hasValidationData || validateMutation.isPending}
                  placeholder="Ej. 3001234567"
                />
              </div>
              <div className="space-y-2">
                <Label>Parentesco</Label>
                <Input
                  value={
                    hasValidationData
                      ? application.validationData.familyReference1?.relationship
                      : ref1Rel
                  }
                  onChange={(e) => setRef1Rel(e.target.value)}
                  disabled={hasValidationData || validateMutation.isPending}
                  placeholder="Ej. Padre"
                />
              </div>
            </div>

            {!hasValidationData && (
              <Button
                onClick={() =>
                  validateMutation.mutate({
                    familyReference1: {
                      name: ref1Name,
                      phone: ref1Phone,
                      relationship: ref1Rel,
                    },
                  })
                }
                disabled={
                  validateMutation.isPending ||
                  !ref1Name ||
                  !ref1Phone ||
                  !ref1Rel
                }
                className="w-full bg-[#0066cc] hover:bg-[#0052a3]"
              >
                {validateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Guardar Validación
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/30">
          <CardHeader className="bg-slate-50/50 border-b border-border/20">
            <CardTitle className="text-lg">Acciones Finales</CardTitle>
            <CardDescription>
              Finaliza la solicitud con o sin desembolso (Requiere validación
              previa).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col sm:flex-row gap-4">
            <Button
              disabled={!hasValidationData || finalizeMutation.isPending}
              onClick={() =>
                setFinalizeDialog({ open: true, withDisbursement: true })
              }
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {finalizeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Finalizar CON Desembolso
            </Button>
            <Button
              disabled={!hasValidationData || finalizeMutation.isPending}
              onClick={() =>
                setFinalizeDialog({ open: true, withDisbursement: false })
              }
              variant="outline"
              className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              {finalizeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Finalizar SIN Desembolso
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación de finalización */}
      <Dialog
        open={finalizeDialog.open}
        onOpenChange={(open) =>
          setFinalizeDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="rounded-lg max-w-sm sm:max-w-md bg-white border border-border/60">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {finalizeDialog.withDisbursement
                ? "¿Finalizar con desembolso?"
                : "¿Finalizar sin desembolso?"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              {finalizeDialog.withDisbursement
                ? "Se finalizará la solicitud y se programará el desembolso del crédito. Esta acción no se puede deshacer."
                : "Se finalizará la solicitud sin procesar ningún desembolso. Esta acción no se puede deshacer."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border/20">
            <Button
              variant="outline"
              onClick={() =>
                setFinalizeDialog((prev) => ({ ...prev, open: false }))
              }
              className="h-10 text-xs font-semibold rounded-lg"
              disabled={finalizeMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              disabled={finalizeMutation.isPending}
              onClick={() => {
                setFinalizeDialog((prev) => ({ ...prev, open: false }));
                finalizeMutation.mutate(finalizeDialog.withDisbursement);
              }}
              className={`h-10 text-xs font-semibold text-white rounded-lg shadow-md transition-all active:scale-[0.98] ${
                finalizeDialog.withDisbursement
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10"
                  : "bg-slate-700 hover:bg-slate-800 shadow-slate-700/10"
              }`}
            >
              {finalizeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              {finalizeDialog.withDisbursement
                ? "Confirmar con Desembolso"
                : "Confirmar sin Desembolso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
