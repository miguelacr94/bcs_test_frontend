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
  const showAdminLogs = role === 'ADMIN';

  return (
    <div className={`grid grid-cols-1 ${showAdminLogs ? 'lg:grid-cols-3' : ''} gap-6`}>
      <div className={`${showAdminLogs ? 'lg:col-span-2' : 'max-w-4xl mx-auto w-full'} space-y-6`}>
        
        {/* Paso 1: Resumen de la Solicitud */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl font-bold">Paso 1: Detalles de Solicitud</CardTitle>
              <CardDescription>ID: {app.id}</CardDescription>
            </div>
            <Badge
              variant="outline"
              className="text-sm px-3 py-1 uppercase"
            >
              {app.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cliente (Documento)</p>
                <p className="text-lg font-semibold">{app.clientId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Canal</p>
                <p className="text-lg font-semibold capitalize">{app.channel.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Creación</p>
                <p className="text-lg font-semibold">
                  {format(new Date(app.createdAt), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paso 2: Generar Oferta (Solo visible si no hay oferta y no está cerrada) */}
        {role === 'CLIENT' && (!app.simulationResult || Object.keys(app.simulationResult).length === 0) && !isClosed && (
          <Card className="border-primary/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader>
              <CardTitle className="text-xl">Paso 2: Solicitar Oferta de Crédito</CardTitle>
              <CardDescription>Ingresa el monto y el plazo para generar la oferta financiera.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto Solicitado</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    value={amount} 
                    placeholder="Ej: 5000000"
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termMonths">Plazo (meses)</Label>
                  <Select 
                    onValueChange={(value) => setTermMonths(Number(value))}
                    value={termMonths ? String(termMonths) : undefined}
                  >
                    <SelectTrigger className="text-lg">
                      <SelectValue placeholder="Selecciona el plazo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 meses</SelectItem>
                      <SelectItem value="24">24 meses</SelectItem>
                      <SelectItem value="36">36 meses</SelectItem>
                      <SelectItem value="48">48 meses</SelectItem>
                      <SelectItem value="60">60 meses</SelectItem>
                      <SelectItem value="72">72 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={() => simulateMutation.mutate()} 
                  disabled={simulateMutation.isPending || !amount || !termMonths}
                  className="w-full md:w-auto text-md h-11 px-8"
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
          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">
                {role === 'CLIENT' ? 'Paso 3: Resultado de Oferta' : 'Resultado de Oferta Generada'}
              </CardTitle>
              <CardDescription>Detalles de la viabilidad financiera.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {app.simulationResult.success && app.simulationResult.offerDetails ? (
                <div className="bg-green-50 border border-green-200 p-6 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <p className="font-bold text-lg text-green-800">{app.simulationResult.message}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 bg-white/60 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Monto Aprobado</p>
                      <p className="text-2xl font-bold text-green-900">${app.simulationResult.offerDetails.approvedAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">Tasa (N.M.V)</p>
                      <p className="text-2xl font-bold text-green-900">{app.simulationResult.offerDetails.interestRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">Plazo</p>
                      <p className="text-2xl font-bold text-green-900">{app.simulationResult.offerDetails.termMonths} meses</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 p-6 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <p className="font-bold text-lg text-red-800">{app.simulationResult.message}</p>
                  </div>
                  {app.simulationResult.offerDetails && (
                    <div className="mt-4 bg-white/60 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-red-700 mb-2">Alternativa sugerida por el banco:</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-red-700">Monto Máximo</p>
                          <p className="font-bold text-red-900">${app.simulationResult.offerDetails.approvedAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-red-700">Tasa (N.M.V)</p>
                          <p className="font-bold text-red-900">{app.simulationResult.offerDetails.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-red-700">Plazo Asignado</p>
                          <p className="font-bold text-red-900">{app.simulationResult.offerDetails.termMonths} meses</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {role === 'CLIENT' && !isClosed && (
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                  <Button
                    className="flex-1 h-12 text-md"
                    disabled={finalizeMutation.isPending || (!app.simulationResult?.success)}
                    onClick={() => finalizeMutation.mutate()}
                  >
                    {finalizeMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    Aceptar Oferta
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-md border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
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
        <div className="lg:col-span-1">
          <Card className="h-full bg-slate-50/50">
            <CardHeader>
              <CardTitle className="text-lg">Panel de Auditoría</CardTitle>
              <CardDescription>Trazabilidad técnica del proceso.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-slate-200 ml-3 pl-5 space-y-8">
                {!events?.length && <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>}
                
                {[...(events || [])].reverse().map((eventObj, idx) => {
                  const date = new Date(eventObj.timestamp);
                  const desc = eventObj.message;

                  return (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[27px] top-1 h-4 w-4 rounded-full bg-slate-300 ring-4 ring-slate-50" />
                      <p className="text-xs text-slate-500 font-medium">
                        {format(date, 'dd/MM/yyyy HH:mm:ss')}
                      </p>
                      <p className="text-sm font-medium leading-relaxed mt-1 text-slate-700">{desc}</p>
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
