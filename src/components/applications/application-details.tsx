'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationService, ApplicationStatus } from '@/services/application.service';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Loader2, Zap, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useRole } from '@/providers/role-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ApplicationDetails() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useRole();

  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [termMonths, setTermMonths] = useState<number | ''>('');

  const { data: app, isLoading, isError } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationService.findById(id),
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ['application-events', id],
    queryFn: () => applicationService.getEvents(id),
    enabled: !!id && role === 'ADMIN',
  });

  const simulateMutation = useMutation({
    mutationFn: () => applicationService.simulateOffer(id, Number(amount) || 0, Number(termMonths) || 0),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['application-events', id] });
      setIsSimulateOpen(false);
      
      if (data.simulationResult?.success) {
        toast({ title: 'Oferta Generada', description: 'Se ha generado una oferta viable exitosamente.' });
      } else {
        toast({ 
          title: 'Oferta No Viable', 
          description: data.simulationResult?.message || 'Revisar detalles.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['application-events', id] });
      toast({
        title: 'Error al solicitar oferta',
        description: error.response?.data?.message || 'Error técnico temporal.',
        variant: 'destructive',
      });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => applicationService.finalize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['application-events', id] });
      toast({ title: 'Oferta Aceptada', description: 'El proceso se completó correctamente.' });
    },
    onError: (error: any) => {
      toast({
        title: 'No se puede aceptar la oferta',
        description: error.response?.data?.message || 'Error desconocido.',
        variant: 'destructive',
      });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: () => applicationService.abandon(id, 'Oferta rechazada por el usuario'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['application-events', id] });
      toast({ title: 'Oferta Rechazada', description: 'La solicitud ha sido cancelada.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al rechazar',
        description: error.response?.data?.message || 'No se puede cancelar esta solicitud.',
        variant: 'destructive',
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
  
  const calculateMonthlyFee = (amount: number, annualRate: number, termMonths: number) => {
    const r = annualRate / 100;
    if (r <= 0) return amount / termMonths;
    const fee = (amount * r) / (1 - Math.pow(1 + r, -termMonths));
    return Math.round(fee);
  };

  const renderOfferDetails = (result: any) => {
    if (!result || !result.offerDetails) return null;
    
    const { approvedAmount, interestRate, termMonths } = result.offerDetails;
    const monthlyFee = calculateMonthlyFee(approvedAmount, interestRate, termMonths);

    if (result.success) {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 text-emerald-800 bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-3.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <p className="font-semibold text-sm leading-tight text-emerald-900">{result.message}</p>
          </div>
          
          <div className="bg-gradient-to-br from-primary/[0.03] to-primary/[0.01] border border-primary/15 rounded-2xl p-6 text-center space-y-2.5 shadow-[0_4px_12px_rgba(0,102,204,0.02)]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto Pre-Aprobado</span>
            <div className="flex items-start justify-center gap-1">
              <span className="text-xl font-bold text-slate-400 mt-2 font-heading">$</span>
              <span className="text-4xl md:text-5xl font-black text-slate-800 font-heading tracking-tight">
                {approvedAmount.toLocaleString('es-CO')}
              </span>
            </div>
            <p className="text-[11px] text-primary font-semibold tracking-wider uppercase">Cupo Listo para Radicación</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50/70 border border-slate-100/80 rounded-xl p-4 space-y-1.5 transition-all hover:bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cuota Mensual (Est.)</span>
              <p className="text-lg font-extrabold text-slate-800 font-heading tracking-tight">
                ${monthlyFee.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-slate-50/70 border border-slate-100/80 rounded-xl p-4 space-y-1.5 transition-all hover:bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tasa de Interés</span>
              <p className="text-lg font-extrabold text-slate-800 font-heading tracking-tight">
                {interestRate}% <span className="text-[10px] text-slate-400 font-bold font-sans">M.V.</span>
              </p>
            </div>
            <div className="bg-slate-50/70 border border-slate-100/80 rounded-xl p-4 space-y-1.5 transition-all hover:bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Plazo Autorizado</span>
              <p className="text-lg font-extrabold text-slate-800 font-heading tracking-tight">
                {termMonths} <span className="text-[10px] text-slate-400 font-bold font-sans">meses</span>
              </p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 text-rose-800 bg-rose-50/30 border border-rose-100/50 rounded-xl p-3.5">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <p className="font-semibold text-sm leading-tight text-rose-900">{result.message}</p>
          </div>

          <div className="bg-slate-50/50 border border-border/40 rounded-xl p-5 space-y-5">
            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monto Alternativo Disponible</span>
              <div className="flex items-start justify-center gap-1">
                <span className="text-lg font-bold text-slate-400 mt-1.5 font-heading">$</span>
                <span className="text-3xl font-black text-slate-800 font-heading tracking-tight">
                  {approvedAmount.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/20 text-center">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cuota Est.</span>
                <p className="text-md font-extrabold text-slate-800 font-heading">
                  ${monthlyFee.toLocaleString('es-CO')}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tasa (M.V.)</span>
                <p className="text-md font-extrabold text-slate-800 font-heading">
                  {interestRate}%
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Plazo</span>
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

  const isClosed = app.status === ApplicationStatus.FINALIZED || app.status === ApplicationStatus.ABANDONED;
  const showAdminLogs = role === 'ADMIN';
  const hasOffer = app.simulationResult && Object.keys(app.simulationResult).length > 0;
  const canSimulate = role === 'CLIENT' && (!app.simulationResult || Object.keys(app.simulationResult).length === 0) && !isClosed;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 animate-in fade-in duration-500">
      {showAdminLogs ? (
        /* VISTA ADMINISTRADOR (Diseño de 3 columnas en escritorio) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Paso 1: Resumen de la Solicitud */}
            <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border/20 bg-slate-50/20 px-6 py-5">
                <div>
                  <CardTitle className="font-heading text-xl font-bold text-slate-800">
                    Detalles de la Solicitud
                  </CardTitle>
                  <CardDescription className="text-xs font-mono mt-0.5 text-slate-400">ID: {app.id}</CardDescription>
                </div>
                <Badge
                  className={`text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider rounded-lg border shadow-none ${
                    app.status === ApplicationStatus.FINALIZED
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : app.status === ApplicationStatus.ABANDONED
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : 'bg-primary/5 text-primary border-primary/10'
                  }`}
                >
                  {app.status}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente (Documento)</p>
                    <p className="text-md font-semibold text-slate-800">{app.clientId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canal de Originación</p>
                    <p className="text-md font-semibold text-slate-800 capitalize">{app.channel.toLowerCase()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Radicación</p>
                    <p className="text-md font-semibold text-slate-800">
                      {format(new Date(app.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paso 3: Decisión de Oferta (Visible si hay oferta) */}
            {hasOffer && (
              <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-5 border-b border-border/20 bg-slate-50/20 px-6 py-5">
                  <CardTitle className="font-heading text-xl font-bold text-slate-800">Resultado de Oferta</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">Condiciones pre-aprobadas válidas para radicación.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {renderOfferDetails(app.simulationResult)}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Panel de Auditoría */}
          <div className="lg:col-span-1">
            <Card className="h-full border border-border/30 shadow-none bg-slate-50/10 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/20 bg-slate-50/20 pb-5 px-6 py-5">
                <CardTitle className="font-heading text-lg font-bold text-slate-800">Panel de Auditoría</CardTitle>
                <CardDescription className="text-xs mt-0.5">Historial técnico del proceso.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 px-6">
                <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6">
                  {!events?.length && <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>}
                  
                  {[...(events || [])].reverse().map((eventObj, idx) => {
                    const date = new Date(eventObj.timestamp);
                    const desc = eventObj.message;

                    return (
                      <div key={idx} className="relative group transition-all">
                        <div className="absolute -left-[30.5px] top-1.5 h-2 w-2 rounded-full bg-slate-300 group-hover:bg-[#0066cc] transition-all duration-300" />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                          {format(date, 'dd/MM/yyyy HH:mm:ss')}
                        </p>
                        <p className="text-sm font-medium leading-relaxed mt-1 text-slate-600 transition-colors group-hover:text-slate-900">{desc}</p>
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
        <div className={`grid grid-cols-1 ${(hasOffer || canSimulate) ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto'} gap-8 items-start`}>
          {/* Columna Izquierda: Información de Solicitud */}
          <div className="space-y-6">
            <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border/20 bg-slate-50/20 px-6 py-5">
                <div>
                  <CardTitle className="font-heading text-xl font-bold text-slate-800">
                    Solicitud de Crédito
                  </CardTitle>
                  <CardDescription className="text-xs font-medium mt-0.5 text-slate-400">Crédito de Libre Destino</CardDescription>
                </div>
                <Badge
                  className={`text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider rounded-lg border shadow-none ${
                    app.status === ApplicationStatus.FINALIZED
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : app.status === ApplicationStatus.ABANDONED
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : 'bg-primary/5 text-primary border-primary/10'
                  }`}
                >
                  {app.status}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente (Documento)</p>
                    <p className="text-md font-semibold text-slate-800">{app.clientId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Radicación</p>
                    <p className="text-md font-semibold text-slate-800">
                      {format(new Date(app.createdAt), 'dd/MM/yyyy HH:mm')}
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
                <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4 px-6 pt-6">
                    <CardTitle className="font-heading text-xl font-bold text-slate-800">Definir Condiciones</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">Ingresa el monto solicitado y el plazo para generar tu propuesta comercial.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monto Solicitado</Label>
                        <Input 
                          id="amount" 
                          type="number" 
                          value={amount} 
                          placeholder="Ej: 10000000"
                          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg text-md font-semibold transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="termMonths" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plazo de Pago</Label>
                        <Select 
                          onValueChange={(value) => setTermMonths(Number(value))}
                          value={termMonths ? String(termMonths) : undefined}
                        >
                          <SelectTrigger className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-lg text-sm font-medium text-slate-700 transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]">
                            <SelectValue placeholder="Selecciona el plazo" />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg shadow-lg border border-primary/10">
                            <SelectItem value="12" className="rounded-md">12 meses</SelectItem>
                            <SelectItem value="24" className="rounded-md">24 meses</SelectItem>
                            <SelectItem value="36" className="rounded-md">36 meses</SelectItem>
                            <SelectItem value="48" className="rounded-md">48 meses</SelectItem>
                            <SelectItem value="60" className="rounded-md">60 meses</SelectItem>
                            <SelectItem value="72" className="rounded-md">72 meses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button 
                        onClick={() => simulateMutation.mutate()} 
                        disabled={simulateMutation.isPending || !amount || !termMonths}
                        className="w-full h-11 px-6 bg-primary hover:bg-primary/95 text-white font-heading font-semibold rounded-lg shadow-md shadow-primary/10 transition-all active:scale-[0.98]"
                      >
                        {simulateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-1.5 h-4 w-4" />}
                        Consultar Viabilidad
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Paso 3: Decisión de Oferta (Si tiene oferta generada) */}
              {hasOffer && (
                <Card className="border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="pb-5 border-b border-border/20 bg-slate-50/20 px-6 py-5">
                    <CardTitle className="font-heading text-xl font-bold text-slate-800">Tu Oferta Comercial</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">Condiciones pre-aprobadas válidas para radicación.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {renderOfferDetails(app.simulationResult)}

                    {role === 'CLIENT' && !isClosed && (
                      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border/25">
                        <Button
                          className="flex-1 h-11 text-sm font-heading font-bold bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg shadow-md shadow-[#0066cc]/10 transition-all active:scale-[0.98]"
                          disabled={finalizeMutation.isPending || (!app.simulationResult?.success)}
                          onClick={() => finalizeMutation.mutate()}
                        >
                          {finalizeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4.5 w-4.5" />}
                          Aceptar Oferta
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 h-11 text-sm font-heading font-semibold border-red-200 text-red-600 hover:bg-red-50/50 hover:text-red-700 rounded-lg transition-colors shadow-none"
                          disabled={abandonMutation.isPending}
                          onClick={() => abandonMutation.mutate()}
                        >
                          {abandonMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4.5 w-4.5" />}
                          Rechazar Oferta
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
    </div>
  );
}
