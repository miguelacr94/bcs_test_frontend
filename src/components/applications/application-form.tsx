"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  applicationRepository,
  customerRepository,
  ApplicationStatus,
} from "@/infrastructure/repositories";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";
import { validateUserStatus } from "@/services/user-validation.service";

const validationSchema = z.object({
  documentType: z.string().min(1, "Selecciona un tipo"),
  document: z.string().min(5, "Documento inválido"),
  terms: z
    .boolean()
    .refine((val) => val === true, "Debes aceptar los términos"),
});

const registrationSchema = z.object({
  name: z.string().min(2, "Obligatorio"),
  lastName: z.string().min(2, "Obligatorio"),
  email: z.string().email("Inválido"),
  phone: z.string().min(7, "Inválido"),
});

type Step = "VALIDATION" | "REGISTRATION" | "EVALUATION";

export function ApplicationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("VALIDATION");
  const [document, setDocument] = useState("");
  
  // Guardado temporal de la info de registro localmente
  const [localRegistrationData, setLocalRegistrationData] = useState<z.infer<typeof registrationSchema> | null>(null);
  
  // Simulación
  const [simAmount, setSimAmount] = useState<number>(10000000);
  const [simTerm, setSimTerm] = useState<number>(36);
  const [offerResult, setOfferResult] = useState<any | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  const validationForm = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: { documentType: "", document: "", terms: false },
  });

  const registrationForm = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", lastName: "", email: "", phone: "" },
  });

  // Mutación para Crear Solicitud Directa (cuando el usuario ya existe en la DB)
  const createApplicationDirect = useMutation({
    mutationFn: (clientId: string) =>
      applicationRepository.create({ clientId, channel: "Autogestionado" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({
        title: "¡Solicitud en proceso!",
        description: "Iniciando análisis de viabilidad...",
      });
      router.push(`/applications/${data.id}`);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message?.[0] || error.message;
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    },
  });

  // Mutación para Validar (Usa la API Composta unificada)
  const validateMutation = useMutation({
    mutationFn: (doc: string) => validateUserStatus(doc),
    onSuccess: async (status, doc) => {
      setDocument(doc);
      
      // 1. Si no existe en el perfil crediticio (o centrales)
      if (!status.isEligible) {
        toast({
          title: "Usuario no elegible",
          description: "El documento ingresado no cuenta con ofertas pre-aprobadas en este momento.",
          variant: "destructive",
        });
        return;
      }

      // 2. Si es elegible pero NO existe en la base de datos local (Customer)
      if (!status.existsInDb) {
        setStep("REGISTRATION");
        return;
      }

      // 3. Si existe en la base de datos local (Customer)
      if (status.activeApplicationId) {
        toast({
          title: "¡Solicitud en curso encontrada!",
          description: "Te estamos redirigiendo para que continúes con tu proceso.",
        });
        router.push(`/applications/${status.activeApplicationId}`);
      } else {
        createApplicationDirect.mutate(doc);
      }
    },
    onError: () => {
      toast({
        title: "Error de validación",
        description: "No pudimos verificar tu documento.",
        variant: "destructive",
      });
    },
  });

  // Mutación Transaccional Única: Aplicar (Envía todo el JSON junto al Backend)
  const applyTransactionMutation = useMutation({
    mutationFn: (payload: { customerData: z.infer<typeof registrationSchema> & { document: string }; offerResult: any }) =>
      customerRepository.applyTransaction(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({
        title: "¡Solicitud Creada con Éxito!",
        description: "El cliente ha sido registrado y la oferta asignada.",
      });
      router.push(`/applications/${data.application.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error al guardar el proceso",
        description: error.response?.data?.message || "No se pudo radicar la solicitud.",
        variant: "destructive",
      });
    },
  });

  const onValidate = (values: z.infer<typeof validationSchema>) => {
    validateMutation.mutate(values.document);
  };

  const onRegister = (values: z.infer<typeof registrationSchema>) => {
    setLocalRegistrationData(values);
    setStep("EVALUATION");
  };

  // Simulación mock de la oferta de forma local/remota antes de aplicar
  const handleLocalSimulate = async () => {
    setEvaluationLoading(true);
    setOfferResult(null);
    try {
      // Simular latencia
      await new Promise((r) => setTimeout(r, 1200));
      
      const random = Math.random();

      // Caso 3: Error técnico temporal (33% probabilidad)
      if (random < 0.33) {
        toast({
          title: "Error técnico temporal",
          description: "Fallo de conexión con el Core del Banco. Intente nuevamente.",
          variant: "destructive",
        });
        setOfferResult({
          type: "ERROR_TECNICO",
          message: "Error técnico temporal de comunicación con centrales.",
        });
      }
      // Caso 2: No viable con alternativa de cupo menor (33% probabilidad)
      else if (random < 0.66) {
        const alternativeAmount = Math.round(simAmount * 0.7);
        setOfferResult({
          type: "NO_VIABLE",
          success: false,
          message: `Monto solicitado de $${simAmount.toLocaleString("es-CO")} no es viable según perfil crediticio.`,
          offerDetails: {
            approvedAmount: alternativeAmount,
            interestRate: 1.85,
            termMonths: Math.min(simTerm, 48),
          }
        });
        toast({
          title: "Oferta alternativa generada",
          description: "El monto solicitado no es viable, te ofrecemos una alternativa.",
          variant: "default",
        });
      }
      // Caso 1: Éxito con oferta preliminar (34% probabilidad)
      else {
        setOfferResult({
          type: "EXITOSO",
          success: true,
          message: "Oferta pre-aprobada disponible",
          offerDetails: {
            approvedAmount: simAmount,
            interestRate: 1.45,
            termMonths: simTerm,
          }
        });
        toast({
          title: "¡Felicitaciones! Oferta aprobada",
          description: "Tu solicitud ha sido pre-aprobada con éxito.",
        });
      }
    } catch (err) {
      toast({
        title: "Error en la consulta",
        description: "Error de red al intentar conectar con el simulador.",
        variant: "destructive",
      });
    } finally {
      setEvaluationLoading(false);
    }
  };

  const handleApply = () => {
    if (!localRegistrationData || !offerResult || offerResult.type === "ERROR_TECNICO") return;
    
    applyTransactionMutation.mutate({
      customerData: {
        ...localRegistrationData,
        document,
      },
      offerResult,
    });
  };

  const isWorking =
    validateMutation.isPending ||
    createApplicationDirect.isPending ||
    applyTransactionMutation.isPending;

  return (
    <div className="bg-card rounded-lg border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] p-8 md:p-10 transition-all duration-500 w-full animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-8">
        <h2 className="font-heading text-xl font-bold text-slate-800 tracking-tight">
          {step === "VALIDATION" ? "Solicítalo aquí" : step === "REGISTRATION" ? "Completa tu perfil" : "Evaluación Crediticia"}
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {step === "VALIDATION"
            ? "Ingresa tus datos para comenzar"
            : step === "REGISTRATION"
            ? "Completa los siguientes campos"
            : "Ingresa el monto para evaluar tu perfil"}
        </p>
      </div>

      {step === "VALIDATION" && (
        <Form {...validationForm}>
          <form
            onSubmit={validationForm.handleSubmit(onValidate)}
            className="flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-300"
          >
            <FormField
              control={validationForm.control}
              name="documentType"
              render={({ field }) => (
                <FormItem className="w-full">
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-lg text-slate-700 font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]">
                        <SelectValue placeholder="Tipo de documento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-lg shadow-lg border border-primary/10">
                      <SelectItem value="CC" className="rounded-md">
                        Cédula de Ciudadanía
                      </SelectItem>
                      <SelectItem value="CE" className="rounded-md">
                        Cédula de Extranjería
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={validationForm.control}
              name="document"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input
                      placeholder="Número de documento"
                      className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={validationForm.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary accent-primary cursor-pointer transition-colors"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-[11px] font-medium text-slate-500 select-none cursor-pointer">
                      He leído y acepto el{" "}
                      <a
                        href="#"
                        className="text-primary hover:underline font-semibold"
                      >
                        tratamiento de datos personales
                      </a>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isWorking}
              className="w-full h-11 bg-primary hover:bg-primary/95 text-white rounded-lg text-sm font-semibold font-heading shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isWorking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Iniciar solicitud"
              )}
            </Button>
          </form>
        </Form>
      )}

      {step === "REGISTRATION" && (
        <Form {...registrationForm}>
          <form
            onSubmit={registrationForm.handleSubmit(onRegister)}
            className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={registrationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Nombres"
                        className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registrationForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Apellidos"
                        className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registrationForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Correo electrónico"
                        className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registrationForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Número de celular"
                        className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-[0.35] h-11 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-secondary transition-colors"
                onClick={() => setStep("VALIDATION")}
                disabled={isWorking}
              >
                Volver
              </Button>
              <Button
                type="submit"
                disabled={isWorking}
                className="flex-1 h-11 bg-primary hover:bg-primary/95 text-white rounded-lg text-sm font-semibold font-heading shadow-md shadow-primary/10 transition-all active:scale-[0.98]"
              >
                {isWorking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Continuar"
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === "EVALUATION" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monto Solicitado</label>
              <Input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg text-md font-semibold transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plazo de Pago</label>
              <Select
                onValueChange={(val) => setSimTerm(Number(val))}
                defaultValue="36"
              >
                <SelectTrigger className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-lg text-sm font-medium text-slate-700 transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]">
                  <SelectValue placeholder="Selecciona el plazo" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border border-primary/10">
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                  <SelectItem value="36">36 meses</SelectItem>
                  <SelectItem value="48">48 meses</SelectItem>
                  <SelectItem value="60">60 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleLocalSimulate}
              disabled={evaluationLoading || isWorking}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold font-heading shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {evaluationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {evaluationLoading ? "Evaluando perfil..." : "Consultar Oferta"}
            </Button>
          </div>

          {/* Resultado de la Evaluación Local */}
          {offerResult && (
            <div className="pt-4 border-t border-border/40 space-y-4 animate-in fade-in duration-300">
              {offerResult.type === "ERROR_TECNICO" ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-4 space-y-1.5">
                  <p className="font-bold text-xs">Fallo de Comunicación</p>
                  <p className="text-[11px] text-rose-700">{offerResult.message}</p>
                </div>
              ) : (
                <div className={`p-4 border rounded-lg space-y-3 ${offerResult.success ? 'bg-emerald-50/30 border-emerald-100' : 'bg-amber-50/30 border-amber-100'}`}>
                  <p className={`font-bold text-xs ${offerResult.success ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {offerResult.success ? "¡Oferta Aprobada!" : "Propuesta Alternativa"}
                  </p>
                  <p className="text-[11px] text-slate-600">{offerResult.message}</p>
                  <div className="grid grid-cols-2 gap-2 text-center bg-white/60 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monto Aprobado</span>
                      <span className="text-sm font-bold text-slate-800">${offerResult.offerDetails.approvedAmount.toLocaleString("es-CO")}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tasa (M.V.)</span>
                      <span className="text-sm font-bold text-slate-800">{offerResult.offerDetails.interestRate}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón de aplicar solo si NO es error técnico */}
              {offerResult.type !== "ERROR_TECNICO" && (
                <Button
                  onClick={handleApply}
                  disabled={isWorking}
                  className="w-full h-11 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg text-sm font-bold font-heading shadow-md shadow-[#0066cc]/10 transition-all flex items-center justify-center"
                >
                  {isWorking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-4.5 w-4.5" />
                  )}
                  Aplicar Crédito
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-secondary transition-colors"
              onClick={() => {
                setOfferResult(null);
                setStep("REGISTRATION");
              }}
              disabled={isWorking || evaluationLoading}
            >
              Volver a Datos de Registro
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
