"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applicationRepository,
  ApplicationStatus,
} from "@/infrastructure/repositories";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatRadicationDate } from "@/lib/date-utils";
import {
  Loader2,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Shield,
  Phone,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useRole } from "@/providers/role-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminValidationPanel } from "./admin-validation-panel";

export function ApplicationDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useRole();

  // Helper function to prevent TypeScript from narrowing role type
  const getRole = (): "CLIENT" | "ADMIN" => role;

  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const [termMonths, setTermMonths] = useState<number | "">("");
  const [isAbandonDialogOpen, setIsAbandonDialogOpen] = useState(false);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [abandonReason, setAbandonReason] = useState("");

  const {
    data: app,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["application", id],
    queryFn: () => applicationRepository.findById(id),
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ["application-events", id],
    queryFn: () => applicationRepository.getEvents(id),
    enabled: !!id && getRole() === "ADMIN",
  });

  const simulateMutation = useMutation({
    mutationFn: () =>
      applicationRepository.simulateOffer(
        id,
        Number(amount) || 0,
        Number(termMonths) || 0,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(["application", id], (old) => ({
        ...(old as any),
        offerResult: data.offerResult,
      }));
      queryClient.invalidateQueries({ queryKey: ["application-events", id] });
      setIsSimulateOpen(false);

      if (data.offerResult?.success) {
        toast({
          title: "Oferta Generada",
          description: "Se ha generado una oferta viable exitosamente.",
        });
      } else {
        toast({
          title: "Oferta No Viable",
          description: data.offerResult?.message || "Revisar detalles.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["application-events", id] });
      toast({
        title: "Error al solicitar oferta",
        description: error.response?.data?.message || "Error técnico temporal.",
        variant: "destructive",
      });
    },
  });

  const acceptOfferMutation = useMutation({
    mutationFn: () =>
      applicationRepository.acceptOffer(
        id,
        getRole() === "ADMIN" ? "Asistido" : undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["application-events", id] });
      toast({
        title: "Oferta Aceptada",
        description: "El proceso se completó correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "No se puede aceptar la oferta",
        description: error.response?.data?.message || "Error desconocido.",
        variant: "destructive",
      });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: (reason: string) =>
      applicationRepository.abandon(
        id,
        reason,
        getRole() === "ADMIN" ? "Asistido" : undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["application-events", id] });
      setIsAbandonDialogOpen(false);
      setAbandonReason("");
      toast({
        title: "Solicitud Abandonada",
        description: "La solicitud ha sido cancelada con éxito.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al abandonar la solicitud",
        description:
          error.response?.data?.message || "No se pudo completar la acción.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { status: ApplicationStatus }) =>
      applicationRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["application-events", id] });
      toast({
        title: "Condiciones abiertas",
        description:
          "Ahora puedes cambiar el monto y plazo para simular nuevamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al modificar condiciones",
        description:
          error.response?.data?.message ||
          "No se pudieron restablecer las condiciones.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !app) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        <AlertCircle className="mr-2 h-6 w-6" />
        Error al cargar el detalle de la solicitud.
      </div>
    );
  }

  const calculateMonthlyFee = (
    amount: number,
    annualRate: number,
    termMonths: number,
  ) => {
    const r = annualRate / 100;
    if (r <= 0) return amount / termMonths;
    const fee = (amount * r) / (1 - Math.pow(1 + r, -termMonths));
    return Math.round(fee);
  };

  const renderOfferDetails = (result: any) => {
    if (!result || !result.offerDetails) return null;

    const { approvedAmount, interestRate, termMonths } = result.offerDetails;
    const monthlyFee = calculateMonthlyFee(
      approvedAmount,
      interestRate,
      termMonths,
    );

    if (result.success) {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 text-emerald-800 bg-emerald-50/30 border border-emerald-100/50 rounded-lg p-3.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <p className="font-semibold text-sm leading-tight text-emerald-900">
              {result.message}
            </p>
          </div>

          <div className="bg-gradient-to-br from-primary/[0.03] to-primary/[0.01] border border-primary/15 rounded-lg p-6 text-center space-y-2.5 shadow-[0_4px_12px_rgba(0,102,204,0.02)]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Monto Pre-Aprobado
            </span>
            <div className="flex items-start justify-center gap-1">
              <span className="text-xl font-bold text-slate-400  font-heading">
                $
              </span>
              <span className="text-4xl md:text-2xl font-semibold text-slate-800 font-heading tracking-tight">
                {approvedAmount.toLocaleString("es-CO")}
              </span>
            </div>
            <p className="text-[11px] text-primary font-semibold tracking-wider uppercase">
              Cupo Listo para Radicación
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50/70 border border-slate-100/80 rounded-lg p-4 space-y-1.5 transition-all hover:bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Cuota Mensual (Est.)
              </span>
              <p className="text-lg font-extrabold text-slate-800 font-heading tracking-tight">
                ${monthlyFee.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="bg-slate-50/70 border border-slate-100/80 rounded-lg p-4 space-y-1.5 transition-all hover:bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Tasa de Interés
              </span>
              <p className="text-lg font-extrabold text-slate-800 font-heading tracking-tight">
                {interestRate}%{" "}
                <span className="text-[10px] text-slate-400 font-bold font-sans">
                  M.V.
                </span>
              </p>
            </div>
            <div className="bg-slate-50/70 border border-slate-100/80 rounded-lg p-4 space-y-1.5 transition-all hover:bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Plazo Autorizado
              </span>
              <p className="text-lg font-extrabold text-slate-800 font-heading tracking-tight">
                {termMonths}{" "}
                <span className="text-[10px] text-slate-400 font-bold font-sans">
                  meses
                </span>
              </p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 text-rose-800 bg-rose-50/30 border border-rose-100/50 rounded-lg p-3.5">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <p className="font-semibold text-sm leading-tight text-rose-900">
              {result.message}
            </p>
          </div>

          <div className="bg-slate-50/50 border border-border/40 rounded-lg p-5 space-y-5">
            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Monto Alternativo Disponible
              </span>
              <div className="flex items-start justify-center gap-1">
                <span className="text-lg font-bold text-slate-400 mt-1.5 font-heading">
                  $
                </span>
                <span className="text-3xl font-black text-slate-800 font-heading tracking-tight">
                  {approvedAmount.toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/20 text-center">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cuota Est.
                </span>
                <p className="text-md font-extrabold text-slate-800 font-heading">
                  ${monthlyFee.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tasa (M.V.)
                </span>
                <p className="text-md font-extrabold text-slate-800 font-heading">
                  {interestRate}%
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Plazo
                </span>
                <p className="text-md font-extrabold text-slate-800 font-heading">
                  {termMonths} m.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const isClosed =
    app.status === ApplicationStatus.FINALIZED ||
    app.status === ApplicationStatus.ABANDONED ||
    app.status === ApplicationStatus.PENDING_VALIDATION;
  const showAdminLogs = getRole() === "ADMIN" && pathname.startsWith("/admin");
  const hasOffer = app.offerResult && Object.keys(app.offerResult).length > 0;
  const canSimulate = false; // Ya no se pueden simular más ofertas desde el detalle
  const lastEvent =
    app.events && app.events.length > 0
      ? app.events[app.events.length - 1]
      : null;
  const isTechnicalError = lastEvent && lastEvent.type === "SYSTEM_ERROR";

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 animate-in fade-in duration-500">
      {showAdminLogs ? (
        /* VISTA ADMINISTRADOR (Diseño de 3 columnas en escritorio) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Paso 1: Resumen de la Solicitud */}
            <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border/20 bg-slate-50/20 px-6 py-5">
                <div>
                  <CardTitle className="font-heading text-xl font-bold text-slate-800">
                    Detalles de la Solicitud
                  </CardTitle>
                  <CardDescription className="text-xs font-mono mt-0.5 text-slate-400">
                    Radicado: {app.radicado}
                  </CardDescription>
                </div>
                <Badge
                  className={`text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider rounded-lg border shadow-none ${
                    app.status === ApplicationStatus.FINALIZED
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : app.status === ApplicationStatus.ABANDONED
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : app.status === ApplicationStatus.PENDING_VALIDATION
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-primary/5 text-primary border-primary/10"
                  }`}
                >
                  {app.status}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Cliente
                    </p>
                    <p className="text-md font-semibold text-slate-800">
                      {app.customer
                        ? `${app.customer.name} ${app.customer.lastName} (${app.customer.document})`
                        : app.clientId}
                    </p>
                  </div>
                  {app.customer?.email && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Correo
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {app.customer.email}
                      </p>
                    </div>
                  )}
                  {app.customer?.phone && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Teléfono
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {app.customer.phone}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Canal de Originación
                    </p>
                    <p className="text-sm font-semibold text-slate-800 capitalize">
                      {app.channel.toLowerCase()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Fecha Radicación
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatRadicationDate(app.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {app.status !== ApplicationStatus.FINALIZED &&
              app.status !== ApplicationStatus.ABANDONED && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="h-10 px-6 text-sm font-heading font-semibold border-red-200 text-red-600 hover:bg-red-50/50 hover:text-red-700 rounded-lg transition-colors shadow-none"
                    disabled={abandonMutation.isPending}
                    onClick={() => setIsAbandonDialogOpen(true)}
                  >
                    {abandonMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-1.5 h-4.5 w-4.5" />
                    )}
                    Abandonar Solicitud
                  </Button>
                </div>
              )}

            {/* Paso 3: Decisión de Oferta (Visible si hay oferta) */}
            {app.offerResult && (
              <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-lg overflow-hidden">
                <CardHeader className="pb-5 border-b border-border/20 bg-slate-50/20 px-6 py-5">
                  <CardTitle className="font-heading text-xl font-bold text-slate-800">
                    Resultado de Oferta
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Condiciones pre-aprobadas válidas para radicación.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {renderOfferDetails(app.offerResult)}

                  {/* Acciones del Admin sobre la oferta cuando está En Proceso */}
                  {app.status === ApplicationStatus.IN_PROGRESS && (
                    <div className="space-y-3 pt-6 border-t border-border/25">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Acciones sobre la oferta
                      </p>
                      <div className="flex flex-col gap-3">
                        <Button
                          className="w-full h-11 text-sm font-heading font-bold bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg shadow-md shadow-[#0066cc]/10 transition-all active:scale-[0.98]"
                          disabled={acceptOfferMutation.isPending}
                          onClick={() => setIsAcceptDialogOpen(true)}
                        >
                          {acceptOfferMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-4.5 w-4.5" />
                          )}
                          Aceptar Oferta
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Panel de Validación (Admin) */}
            <AdminValidationPanel application={app} />
          </div>

          {/* Panel de Auditoría */}
          <div className="lg:col-span-1">
            <Card className="h-full border border-border/30 shadow-none bg-slate-50/10 rounded-lg overflow-hidden">
              <CardHeader className="border-b border-border/20 bg-slate-50/20 pb-5 px-6 py-5">
                <CardTitle className="font-heading text-lg font-bold text-slate-800">
                  Panel de Auditoría
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Historial técnico del proceso.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 px-6">
                <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6">
                  {!events?.length && (
                    <p className="text-sm text-muted-foreground">
                      Sin eventos registrados.
                    </p>
                  )}

                  {[...(events || [])].reverse().map((eventObj, idx) => {
                    let date: Date | null = null;
                    let formattedDate = "Fecha no disponible";

                    // Parse createdAt field (ISO format from backend)
                    if (eventObj.createdAt) {
                      try {
                        date = new Date(eventObj.createdAt);
                        if (date && !isNaN(date.getTime())) {
                          formattedDate = format(date, "dd/MM/yyyy HH:mm:ss");
                        }
                      } catch (e) {
                        console.warn(
                          "Invalid date format:",
                          eventObj.createdAt,
                          e,
                        );
                      }
                    }

                    const desc = eventObj.message;
                    const hasStatusTransition =
                      eventObj.previousStatus &&
                      eventObj.nextStatus &&
                      eventObj.previousStatus !== eventObj.nextStatus;

                    return (
                      <div key={idx} className="relative group transition-all">
                        <div className="absolute -left-[30.5px] top-1.5 h-2 w-2 rounded-full bg-slate-300 group-hover:bg-[#0066cc] transition-all duration-300" />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                          {formattedDate}
                        </p>
                        <div className="mt-1">
                          <p className="text-sm font-medium leading-relaxed text-slate-600 transition-colors group-hover:text-slate-900">
                            {desc}
                          </p>
                          {hasStatusTransition && (
                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                                {eventObj.previousStatus}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
                                {eventObj.nextStatus}
                              </span>
                            </div>
                          )}
                          {eventObj.metadata?.reason && (
                            <div className="mt-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-md">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Razón o Motivo:</span>
                              <span className="text-xs text-slate-700 italic">"{eventObj.metadata.reason}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* VISTA CLIENTE (Diseño de 2 columnas lado a lado en escritorio, aprovechando el espacio) */
        <div
          className={`grid grid-cols-1 ${hasOffer || canSimulate ? "lg:grid-cols-2" : "max-w-2xl mx-auto"} gap-8 items-start`}
        >
          {/* Columna Izquierda: Información de Solicitud */}
          <div className="space-y-6">
            <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border/20 bg-slate-50/20 px-6 py-5">
                <div>
                  <CardTitle className="font-heading text-xl font-bold text-slate-800">
                    Solicitud de Crédito
                  </CardTitle>
                  <CardDescription className="text-xs font-medium mt-0.5 text-slate-400">
                    Crédito de Libre Destino
                  </CardDescription>
                </div>
                <Badge
                  className={`text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider rounded-lg border shadow-none ${
                    app.status === ApplicationStatus.FINALIZED
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : app.status === ApplicationStatus.ABANDONED
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : app.status === ApplicationStatus.PENDING_VALIDATION
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-primary/5 text-primary border-primary/10"
                  }`}
                >
                  {app.status}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Cliente (Documento)
                    </p>
                    <p className="text-md font-semibold text-slate-800">
                      {app.clientId}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Fecha Radicación
                    </p>
                    <p className="text-md font-semibold text-slate-800">
                      {formatRadicationDate(app.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {app.status !== ApplicationStatus.FINALIZED &&
              app.status !== ApplicationStatus.ABANDONED && (
                <div className="flex flex-col gap-3 mt-2">
                  <Button
                    variant="outline"
                    className="w-full h-11 text-sm font-heading font-semibold border-red-200 text-red-600 hover:bg-red-50/50 hover:text-red-700 rounded-lg transition-colors shadow-none"
                    disabled={abandonMutation.isPending}
                    onClick={() => setIsAbandonDialogOpen(true)}
                  >
                    {abandonMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-1.5 h-4.5 w-4.5" />
                    )}
                    Abandonar Solicitud
                  </Button>
                </div>
              )}
          </div>

          {/* Columna Derecha: Formulario de Viabilidad u Oferta Pre-aprobada */}
          {(hasOffer || canSimulate) && (
            <div className="space-y-6">
              {/* Alerta de Error Técnico Temporal en Simulación */}
              {isTechnicalError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <span className="font-bold text-sm">
                      Fallo Técnico en la Validación
                    </span>
                  </div>
                  <p className="text-xs text-red-700 font-medium">
                    {lastEvent.message}. Por favor revisa los datos de
                    simulación e intenta nuevamente.
                  </p>
                </div>
              )}

              {/* Paso 2: Generar Oferta (Si no tiene oferta y está abierta) */}
              {canSimulate && (
                <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-lg overflow-hidden">
                  <CardHeader className="pb-4 px-6 pt-6">
                    <CardTitle className="font-heading text-xl font-bold text-slate-800">
                      Definir Condiciones
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      Ingresa el monto solicitado y el plazo para generar tu
                      propuesta comercial.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="amount"
                          className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >
                          Monto Solicitado
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          value={amount}
                          placeholder="Ej: 10000000"
                          onChange={(e) =>
                            setAmount(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg text-md font-semibold transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="termMonths"
                          className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >
                          Plazo de Pago
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            setTermMonths(Number(value))
                          }
                          value={termMonths ? String(termMonths) : undefined}
                        >
                          <SelectTrigger className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-lg text-sm font-medium text-slate-700 transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]">
                            <SelectValue placeholder="Selecciona el plazo" />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg shadow-lg border border-primary/10">
                            <SelectItem value="12" className="rounded-md">
                              12 meses
                            </SelectItem>
                            <SelectItem value="24" className="rounded-md">
                              24 meses
                            </SelectItem>
                            <SelectItem value="36" className="rounded-md">
                              36 meses
                            </SelectItem>
                            <SelectItem value="48" className="rounded-md">
                              48 meses
                            </SelectItem>
                            <SelectItem value="60" className="rounded-md">
                              60 meses
                            </SelectItem>
                            <SelectItem value="72" className="rounded-md">
                              72 meses
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => simulateMutation.mutate()}
                        disabled={
                          simulateMutation.isPending || !amount || !termMonths
                        }
                        className="w-full h-11 px-6 bg-primary hover:bg-primary/95 text-white font-heading font-semibold rounded-lg shadow-md shadow-primary/10 transition-all active:scale-[0.98]"
                      >
                        {simulateMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="mr-1.5 h-4 w-4" />
                        )}
                        Consultar Viabilidad
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Paso 3: Decisión de Oferta (Si tiene oferta generada) */}
              {app.offerResult && !isTechnicalError && (
                <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-lg overflow-hidden">
                  <CardHeader className="pb-5 border-b border-border/20 bg-slate-50/20 px-6 py-5">
                    <CardTitle className="font-heading text-xl font-bold text-slate-800">
                      Tu Oferta Comercial
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      Condiciones pre-aprobadas válidas para radicación.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {renderOfferDetails(app.offerResult)}
                    {app.status === ApplicationStatus.IN_PROGRESS &&
                      app.offerResult &&
                      !isTechnicalError && (
                        <Button
                          className="w-full h-11 text-sm font-heading font-bold bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg shadow-md shadow-[#0066cc]/10 transition-all active:scale-[0.98]"
                          disabled={acceptOfferMutation.isPending}
                          onClick={() => setIsAcceptDialogOpen(true)}
                        >
                          {acceptOfferMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-4.5 w-4.5" />
                          )}
                          Aceptar Oferta
                        </Button>
                      )}

                    {isClosed && app.status === ApplicationStatus.FINALIZED && (
                      <div className="pt-6 border-t border-border/25 text-center space-y-3 animate-in fade-in duration-300">
                        <div className={`inline-flex items-center justify-center p-2 rounded-lg border ${app.statusReason ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-100/50"}`}>
                          <CheckCircle2 className={`h-5 w-5 mr-2 ${app.statusReason ? "text-slate-600" : "text-emerald-600"}`} />
                          <span className="text-sm font-bold font-heading">
                            {app.statusReason ? "Finalizada sin Desembolso" : "Oferta Aceptada y Crédito Radicado"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {app.statusReason
                            ? "Tu solicitud ha sido finalizada correctamente sin procesar un desembolso."
                            : "Tu solicitud ha sido finalizada con éxito. Nos pondremos en contacto contigo pronto para formalizar el desembolso."}
                        </p>
                        {app.statusReason && (
                          <div className="mt-3 p-3 bg-slate-50/80 border border-slate-200 rounded-md text-left">
                            <span className="text-[10px] font-bold text-slate-700 uppercase block mb-1">Razón de Finalización:</span>
                            <span className="text-xs text-slate-800 italic">"{app.statusReason}"</span>
                          </div>
                        )}
                      </div>
                    )}
                    {isClosed &&
                      app.status === ApplicationStatus.PENDING_VALIDATION && (
                        <div className="pt-6 border-t border-border/25 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          {/* Cabecera de estado */}
                          <div className="text-center space-y-2">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-100 mx-auto">
                              <Shield className="h-6 w-6 text-amber-600" />
                            </div>
                            <h3 className="text-base font-heading font-bold text-slate-800">
                              Tu solicitud está en estudio
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                              Hemos recibido tu solicitud exitosamente. Nuestro
                              equipo de analistas está realizando el estudio
                              crediticio correspondiente.
                            </p>
                          </div>

                          {/* Pasos del proceso */}
                          <div className="bg-slate-50/70 rounded-lg border border-slate-100 p-4 space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Proceso de validación
                            </p>
                            <div className="space-y-2.5">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center mt-0.5">
                                  <CheckCircle2 className="h-3 w-3 text-amber-600" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700">
                                    Solicitud radicada
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Tu oferta ha sido registrada y aceptada en
                                    el sistema.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-400 border border-amber-500 flex items-center justify-center mt-0.5">
                                  <Clock className="h-3 w-3 text-white" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-amber-700">
                                    Estudio de crédito en curso
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Validación de perfil crediticio, centrales
                                    de riesgo e historial financiero.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center mt-0.5">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-400">
                                    Toma de datos adicionales
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Un asesor se comunicará contigo para validar
                                    la información requerida.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center mt-0.5">
                                  <FileText className="h-3 w-3 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-400">
                                    Resolución final
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Recibirás la respuesta definitiva de tu
                                    solicitud de crédito.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Nota informativa */}
                          <div className="flex items-start gap-2.5 bg-amber-50/60 border border-amber-100 rounded-lg p-3">
                            <Phone className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                              Próximamente un asesor se comunicará contigo para
                              continuar con el proceso. Mantén tu teléfono
                              disponible y revisa tu correo electrónico.
                            </p>
                          </div>
                        </div>
                      )}
                    {isClosed && app.status === ApplicationStatus.ABANDONED && (
                      <div className="pt-6 border-t border-border/25 text-center space-y-4 animate-in fade-in duration-300">
                        <div className="inline-flex items-center justify-center p-2 bg-rose-50 text-rose-700 rounded-lg border border-rose-100/50">
                          <XCircle className="h-5 w-5 mr-2 text-rose-600" />
                          <span className="text-sm font-bold font-heading">
                            Solicitud Cancelada
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Esta solicitud ha sido abandonada. Si deseas
                          continuar, debes iniciar una nueva solicitud.
                        </p>
                        {app.statusReason && (
                          <div className="mt-3 p-3 bg-rose-50/50 border border-rose-100 rounded-md text-left">
                            <span className="text-[10px] font-bold text-rose-700 uppercase block mb-1">Motivo de Abandono:</span>
                            <span className="text-xs text-rose-800 italic">"{app.statusReason}"</span>
                          </div>
                        )}
                        <Button
                          onClick={() => router.push("/")}
                          className="w-full h-10 text-xs font-semibold bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg shadow-md transition-all active:scale-[0.98]"
                        >
                          Volver al Inicio
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
      {/* Diálogo de Motivo de Abandono Obligatorio */}
      <Dialog open={isAbandonDialogOpen} onOpenChange={setIsAbandonDialogOpen}>
        <DialogContent className="rounded-lg max-w-sm sm:max-w-md bg-white border border-border/60">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-800">
              ¿Seguro que desea abandonar?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Si abandona el proceso tendrá que realizar una nueva solicitud.
              Selecciona o ingresa un motivo para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="space-y-2">
              <Label
                htmlFor="reason-select"
                className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
              >
                Selecciona una opción
              </Label>
              <Select
                onValueChange={(val) => setAbandonReason(val || "")}
                value={abandonReason}
              >
                <SelectTrigger className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-lg text-sm font-medium text-slate-700 transition-all">
                  <SelectValue placeholder="Selecciona el motivo" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border border-primary/10">
                  <SelectItem
                    value="Encontré mejor tasa en otro banco"
                    className="rounded-md"
                  >
                    Encontré mejor tasa en otro banco
                  </SelectItem>
                  <SelectItem
                    value="Ya no requiero el crédito"
                    className="rounded-md"
                  >
                    Ya no requiero el crédito
                  </SelectItem>
                  <SelectItem
                    value="Monto aprobado es insuficiente"
                    className="rounded-md"
                  >
                    Monto aprobado es insuficiente
                  </SelectItem>
                  <SelectItem
                    value="El plazo de pago es muy corto"
                    className="rounded-md"
                  >
                    El plazo de pago es muy corto
                  </SelectItem>
                  <SelectItem value="Otro" className="rounded-md">
                    Otro motivo...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="custom-reason"
                className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
              >
                O escribe un motivo personalizado
              </Label>
              <Input
                id="custom-reason"
                type="text"
                placeholder="Escribe aquí tu motivo..."
                value={abandonReason}
                onChange={(e) => setAbandonReason(e.target.value)}
                className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg text-sm transition-all"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border/20">
            <Button
              variant="outline"
              onClick={() => {
                setIsAbandonDialogOpen(false);
                setAbandonReason("");
              }}
              className="h-10 text-xs font-semibold rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              disabled={abandonMutation.isPending || !abandonReason.trim()}
              onClick={() => abandonMutation.mutate(abandonReason)}
              className="h-10 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md shadow-red-600/10 transition-all active:scale-[0.98]"
            >
              {abandonMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-1.5 h-4 w-4" />
              )}
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación Aceptar Oferta */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent className="rounded-lg max-w-sm sm:max-w-md bg-white border border-border/60">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-800">
              ¿Aceptar esta oferta?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Una vez confirmada la oferta no podrá realizar cambios.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border/20">
            <Button
              variant="outline"
              onClick={() => setIsAcceptDialogOpen(false)}
              className="h-10 text-xs font-semibold rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              disabled={acceptOfferMutation.isPending}
              onClick={() => {
                setIsAcceptDialogOpen(false);
                acceptOfferMutation.mutate();
              }}
              className="h-10 text-xs font-semibold bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg shadow-md transition-all active:scale-[0.98]"
            >
              {acceptOfferMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              Confirmar Aceptación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
