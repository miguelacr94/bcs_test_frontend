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

  const isClosed = app.status === ApplicationStatus.FINALIZED || app.status === ApplicationStatus.ABANDONED;
  const showAdminLogs = role === 'ADMIN';  return (
    <div className={`grid grid-cols-1 ${showAdminLogs ? 'lg:grid-cols-3' : ''} gap-8 max-w-7xl mx-auto w-full px-4 py-8`}>
      <div className={`${showAdminLogs ? 'lg:col-span-2' : 'max-w-3xl mx-auto w-full'} space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500`}>
        
        {/* Paso 1: Resumen de la Solicitud */}
        <Card className="border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border/30 bg-slate-50/50">
            <div>
              <span className="text-xs font-bold text-[#0066cc] uppercase tracking-wider">Detalles Generales</span>
              <CardTitle className="font-heading text-2xl font-extrabold mt-1 text-slate-800">Paso 1: Solicitud de Financiación</CardTitle>
              <CardDescription className="text-xs font-mono mt-1 text-slate-400">ID: {app.id}</CardDescription>
            </div>
            <Badge
              className={`text-xs px-3.5 py-1.5 font-bold uppercase tracking-wider rounded-xl border ${
                app.status === ApplicationStatus.FINALIZED
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : app.status === ApplicationStatus.ABANDONED
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-primary/5 text-primary border-primary/20'
              }`}
            >
              {app.status}
            </Badge>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-secondary/40 p-4 rounded-2xl border border-border/20">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliente (Documento)</p>
                <p className="text-md font-bold text-slate-800 mt-1">{app.clientId}</p>
              </div>
              <div className="bg-secondary/40 p-4 rounded-2xl border border-border/20">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Canal de Originación</p>
                <p className="text-md font-bold text-slate-800 mt-1 capitalize">{app.channel.toLowerCase()}</p>
              </div>
              <div className="bg-secondary/40 p-4 rounded-2xl border border-border/20">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha Radicación</p>
                <p className="text-md font-bold text-slate-800 mt-1">
                  {format(new Date(app.createdAt), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paso 2: Generar Oferta (Solo visible si no hay oferta y no está cerrada) */}
        {role === 'CLIENT' && (!app.simulationResult || Object.keys(app.simulationResult).length === 0) && !isClosed && (
          <Card className="border border-primary/20 shadow-[0_12px_40px_rgba(0,102,204,0.05)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
            <CardHeader className="pb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Análisis Financiero</span>
              <CardTitle className="font-heading text-xl font-extrabold mt-1 text-slate-800">Paso 2: Generar Oferta de Crédito</CardTitle>
              <CardDescription className="text-sm text-slate-500">Ingresa el monto solicitado y el plazo para validar tu oferta financiera personalizada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto Solicitado</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    value={amount} 
                    placeholder="Ej: 10000000"
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-12 bg-transparent border-border hover:border-primary/50 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary rounded-xl text-lg font-bold"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="termMonths" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plazo de Pago (Meses)</Label>
                  <Select 
                    onValueChange={(value) => setTermMonths(Number(value))}
                    value={termMonths ? String(termMonths) : undefined}
                  >
                    <SelectTrigger className="h-12 bg-transparent border-border hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-md font-semibold text-slate-700">
                      <SelectValue placeholder="Selecciona el plazo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      <SelectItem value="12" className="rounded-lg">12 meses</SelectItem>
                      <SelectItem value="24" className="rounded-lg">24 meses</SelectItem>
                      <SelectItem value="36" className="rounded-lg">36 meses</SelectItem>
                      <SelectItem value="48" className="rounded-lg">48 meses</SelectItem>
                      <SelectItem value="60" className="rounded-lg">60 meses</SelectItem>
                      <SelectItem value="72" className="rounded-lg">72 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={() => simulateMutation.mutate()} 
                  disabled={simulateMutation.isPending || !amount || !termMonths}
                  className="w-full md:w-auto h-12 px-8 bg-primary hover:bg-primary/95 text-white font-heading font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  {simulateMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
                  Consultar Viabilidad
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso 3: Decisión de Oferta (Visible si hay oferta) */}
        {app.simulationResult && Object.keys(app.simulationResult).length > 0 && (
          <Card className="border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="pb-6 border-b border-border/30 bg-slate-50/50">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Simulación de Core</span>
              <CardTitle className="font-heading text-xl font-extrabold mt-1 text-slate-800">
                {role === 'CLIENT' ? 'Paso 3: Resultado de Oferta' : 'Resultado de Oferta Generada'}
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">Detalle de viabilidad y condiciones financieras pre-aprobadas.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {app.simulationResult.success && app.simulationResult.offerDetails ? (
                <div className="bg-emerald-50/40 border border-emerald-100 p-6 rounded-2xl space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                    <p className="font-bold text-lg text-emerald-950 font-heading tracking-tight">{app.simulationResult.message}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-emerald-100/50 p-5 rounded-xl shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Monto Aprobado</p>
                      <p className="text-3xl font-extrabold text-emerald-950 mt-1 font-heading tracking-tight">
                        ${app.simulationResult.offerDetails.approvedAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Tasa (N.M.V)</p>
                      <p className="text-3xl font-extrabold text-emerald-950 mt-1 font-heading tracking-tight">
                        {app.simulationResult.offerDetails.interestRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Plazo Autorizado</p>
                      <p className="text-3xl font-extrabold text-emerald-950 mt-1 font-heading tracking-tight">
                        {app.simulationResult.offerDetails.termMonths} <span className="text-sm font-bold text-emerald-700">meses</span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50/40 border border-rose-100 p-6 rounded-2xl space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-800">
                      <AlertCircle className="h-4.5 w-4.5" />
                    </div>
                    <p className="font-bold text-lg text-rose-950 font-heading tracking-tight">{app.simulationResult.message}</p>
                  </div>
                  {app.simulationResult.offerDetails && (
                    <div className="bg-white border border-rose-100/50 p-5 rounded-xl shadow-sm">
                      <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-3">Alternativa sugerida por el banco:</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Monto Máximo</p>
                          <p className="text-2xl font-extrabold text-slate-800 mt-1 font-heading">
                            ${app.simulationResult.offerDetails.approvedAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Tasa (N.M.V)</p>
                          <p className="text-2xl font-extrabold text-slate-800 mt-1 font-heading">
                            {app.simulationResult.offerDetails.interestRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Plazo Sugerido</p>
                          <p className="text-2xl font-extrabold text-slate-800 mt-1 font-heading">
                            {app.simulationResult.offerDetails.termMonths} meses
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {role === 'CLIENT' && !isClosed && (
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border/30">
                  <Button
                    className="flex-1 h-12 text-md font-heading font-bold bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-xl shadow-md shadow-[#0066cc]/10 transition-all active:scale-[0.98]"
                    disabled={finalizeMutation.isPending || (!app.simulationResult?.success)}
                    onClick={() => finalizeMutation.mutate()}
                  >
                    {finalizeMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    Aceptar Oferta
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-md font-heading font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors"
                    disabled={abandonMutation.isPending}
                    onClick={() => abandonMutation.mutate()}
                  >
                    {abandonMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <XCircle className="mr-2 h-5 w-5" />}
                    Rechazar Oferta
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bitácora de Eventos (Solo Admin) */}
      {showAdminLogs && (
        <div className="lg:col-span-1 animate-in fade-in slide-in-from-right-8 duration-500">
          <Card className="h-full border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-slate-50/50 pb-6">
              <CardTitle className="font-heading text-lg font-extrabold text-slate-800">Panel de Auditoría</CardTitle>
              <CardDescription className="text-xs mt-1">Historial y trazabilidad técnica en tiempo real.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6">
                {!events?.length && <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>}
                
                {[...(events || [])].reverse().map((eventObj, idx) => {
                  const date = new Date(eventObj.timestamp);
                  const desc = eventObj.message;

                  return (
                    <div key={idx} className="relative group transition-all">
                      <div className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-slate-100 group-hover:bg-[#0066cc] group-hover:ring-[#0066cc]/10 transition-all duration-300" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {format(date, 'dd/MM/yyyy HH:mm:ss')}
                      </p>
                      <p className="text-sm font-medium leading-relaxed mt-1 text-slate-700 transition-colors group-hover:text-slate-900">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
