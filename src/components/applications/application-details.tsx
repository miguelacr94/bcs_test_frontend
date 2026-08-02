"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applicationRepository,
  ApplicationStatus,
} from "@/infrastructure/repositories";
import { useParams } from "next/navigation";
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
import { Loader2, Zap, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
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

export function ApplicationDetails() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useRole();

  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const [termMonths, setTermMonths] = useState<number | "">("");
  const [isAbandonDialogOpen, setIsAbandonDialogOpen] = useState(false);
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
    enabled: !!id && role === "ADMIN",
  });

  const simulateMutation = useMutation({
    mutationFn: () =>
      applicationRepository.simulateOffer(
        id,
        Number(amount) || 0,
        Number(termMonths) || 0,
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["application-events", id] });
      setIsSimulateOpen(false);

      if (data.simulationResult?.success) {
        toast({
          title: "Oferta Generada",
          description: "Se ha generado una oferta viable exitosamente.",
        });
      } else {
        toast({
          title: "Oferta No Viable",
          description: data.simulationResult?.message || "Revisar detalles.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["application-events", id] });
      toast({
        title: "Error al solicitar oferta",
        description: error.response?.data?.message || "Error técnico temporal.",
        variant: "destructive",
      });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => applicationRepository.finalize(id),
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
      applicationRepository.abandon(id, reason),
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
          error.response?.data?.message ||
          "No se pudo completar la acción.",
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
        description: "Ahora puedes cambiar el monto y plazo para simular nuevamente.",
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
    app.status === ApplicationStatus.ABANDONED;
  const showAdminLogs = role === "ADMIN";
  const hasOffer =
    app.status === ApplicationStatus.VALIDATED &&
    app.simulationResult && Object.keys(app.simulationResult).length > 0;
  const canSimulate =
    role === "CLIENT" &&
    (app.status === ApplicationStatus.IN_PROGRESS || app.status === ApplicationStatus.PENDING_VALIDATION) &&
    !isClosed;

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
                    ID: {app.id}
                  </CardDescription>
                </div>
                <Badge
                  className={`text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider rounded-lg border shadow-none ${
                    app.status === ApplicationStatus.FINALIZED
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : app.status === ApplicationStatus.ABANDONED
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : app.status === ApplicationStatus.VALIDATED
                          ? "bg-indigo-50 text-indigo-700 border-indigo-100"
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
                      Cliente (Documento)
                    </p>
                    <p className="text-md font-semibold text-slate-800">
                      {app.clientId}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Canal de Originación
                    </p>
                    <p className="text-md font-semibold text-slate-800 capitalize">
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

            {/* Paso 3: Decisión de Oferta (Visible si hay oferta) */}
            {hasOffer && (
              <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-lg overflow-hidden">
                <CardHeader className="pb-5 border-b border-border/20 bg-slate-50/20 px-6 py-5">
                  <CardTitle className="font-heading text-xl font-bold text-slate-800">
                    Resultado de Oferta
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Condiciones pre-aprobadas válidas para radicación.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {renderOfferDetails(app.simulationResult)}
                </CardContent>
              </Card>
            )}
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
                    const date = new Date(eventObj.timestamp);
                    const desc = eventObj.message;

                    return (
                      <div key={idx} className="relative group transition-all">
                        <div className="absolute -left-[30.5px] top-1.5 h-2 w-2 rounded-full bg-slate-300 group-hover:bg-[#0066cc] transition-all duration-300" />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                          {format(date, "dd/MM/yyyy HH:mm:ss")}
                        </p>
                        <p className="text-sm font-medium leading-relaxed mt-1 text-slate-600 transition-colors group-hover:text-slate-900">
                          {desc}
                        </p>
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
                        : app.status === ApplicationStatus.VALIDATED
                          ? "bg-indigo-50 text-indigo-700 border-indigo-100"
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
          </div>

          {/* Columna Derecha: Formulario de Viabilidad u Oferta Pre-aprobada */}
          {(hasOffer || canSimulate) && (
            <div className="space-y-6">
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
              {hasOffer && (
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
                    {renderOfferDetails(app.simulationResult)}

                    {role === "CLIENT" && !isClosed && (
                      <div className="space-y-3 pt-6 border-t border-border/25">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Button
                            className="flex-1 h-11 text-sm font-heading font-bold bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg shadow-md shadow-[#0066cc]/10 transition-all active:scale-[0.98]"
                            disabled={
                              finalizeMutation.isPending ||
                              !app.simulationResult?.success
                            }
                            onClick={() => finalizeMutation.mutate()}
                          >
                            {finalizeMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-1.5 h-4.5 w-4.5" />
                            )}
                            Aceptar Oferta
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 h-11 text-sm font-heading font-semibold border-red-200 text-red-600 hover:bg-red-50/50 hover:text-red-700 rounded-lg transition-colors shadow-none"
                            disabled={abandonMutation.isPending}
                            onClick={() => setIsAbandonDialogOpen(true)}
                          >
                            {abandonMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-1.5 h-4.5 w-4.5" />
                            )}
                            Rechazar Oferta
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full h-11 text-sm font-heading font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              status: ApplicationStatus.IN_PROGRESS,
                            })
                          }
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="mr-1.5 h-4 w-4" />
                          )}
                          Modificar Condiciones (Simular otra vez)
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
              ¿Por qué deseas rechazar la oferta?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Para cancelar la solicitud, por favor ingresa o selecciona un motivo obligatorio.
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
                  <SelectItem value="Encontré mejor tasa en otro banco" className="rounded-md">
                    Encontré mejor tasa en otro banco
                  </SelectItem>
                  <SelectItem value="Ya no requiero el crédito" className="rounded-md">
                    Ya no requiero el crédito
                  </SelectItem>
                  <SelectItem value="Monto aprobado es insuficiente" className="rounded-md">
                    Monto aprobado es insuficiente
                  </SelectItem>
                  <SelectItem value="El plazo de pago es muy corto" className="rounded-md">
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
    </div>
  );
}
