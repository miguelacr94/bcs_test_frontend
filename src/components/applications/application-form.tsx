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

interface ApplicationFormProps {
  mode?: "client" | "admin";
  onSuccess?: (applicationId: string) => void;
}

export function ApplicationForm({
  mode = "client",
  onSuccess,
}: ApplicationFormProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("VALIDATION");
  const [document, setDocument] = useState("");

  // Guardado temporal de la info de registro localmente
  const [localRegistrationData, setLocalRegistrationData] = useState<z.infer<
    typeof registrationSchema
  > | null>(null);

  const [simAmount, setSimAmount] = useState<number | string>("");
  const [simTerm, setSimTerm] = useState<number | string>("");
  const [offerResult, setOfferResult] = useState<any | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [globalError, setGlobalError] = useState<{
    message: string;
    availableDate?: string;
    daysRemaining?: number;
  } | null>(null);

  const validationForm = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: { documentType: "", document: "", terms: false },
  });

  const registrationForm = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", lastName: "", email: "", phone: "" },
  });

  const channel = mode === "admin" ? "Asistido" : "Autogestionado";

  const handleApplicationSuccess = (applicationId: string) => {
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    if (onSuccess) {
      onSuccess(applicationId);
    } else {
      router.push(`/status/${applicationId}`);
    }
  };

  // Mutación para Crear Solicitud Directa (cuando el usuario ya existe en la DB)
  const createApplicationDirect = useMutation({
    mutationFn: (clientId: string) =>
      applicationRepository.create({ clientId, channel }),
    onSuccess: (data) => {
      toast({
        title: "¡Solicitud en proceso!",
        description: "Iniciando análisis de viabilidad...",
      });
      handleApplicationSuccess(data.id);
    },
    onError: (error: any) => {
      const responseData = error.response?.data;
      const msg = Array.isArray(responseData?.message) ? responseData.message[0] : responseData?.message || error.message;
      setGlobalError({
        message: msg,
        availableDate: responseData?.availableDate,
        daysRemaining: responseData?.daysRemaining,
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
          title: "Documento no registrado",
          description:
            "No se encontró información para el documento ingresado.",
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
        const toastDesc =
          mode === "admin"
            ? "Redirigiendo al detalle de la solicitud existente."
            : "Te estamos redirigiendo para que continúes con tu proceso.";
        toast({
          title: "¡Solicitud en curso encontrada!",
          description: toastDesc,
        });
        handleApplicationSuccess(status.activeApplicationId);
      } else {
        // Tiene perfil registrado pero no tiene aplicación: ir a evaluación de oferta
        setIsExistingCustomer(true);
        toast({
          title: "Perfil encontrado",
          description: "Consulta tu oferta para continuar con la solicitud.",
        });
        setStep("EVALUATION");
      }
    },
    onError: (error: any) => {
      const responseData = error.response?.data;
      if (responseData?.availableDate) {
        const msg = Array.isArray(responseData?.message) ? responseData.message[0] : responseData?.message || error.message;
        setGlobalError({
          message: msg,
          availableDate: responseData.availableDate,
          daysRemaining: responseData.daysRemaining,
        });
      } else {
        toast({
          title: "Error de validación",
          description: responseData?.message || "No pudimos verificar tu documento.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutación Transaccional Única: Aplicar (Envía todo el JSON junto al Backend)
  const applyTransactionMutation = useMutation({
    mutationFn: (payload: {
      customerData: z.infer<typeof registrationSchema> & {
        document: string;
        channel: string;
      };
      offerResult: any;
    }) => customerRepository.applyTransaction(payload),
    onSuccess: (data) => {
      toast({
        title: "¡Solicitud Creada con Éxito!",
        description: "El cliente ha sido registrado y la oferta asignada.",
      });
      handleApplicationSuccess(data.application.id);
    },
    onError: (error: any) => {
      const responseData = error.response?.data;
      const msg = Array.isArray(responseData?.message) ? responseData.message[0] : responseData?.message || error.message;
      setGlobalError({
        message: msg,
        availableDate: responseData?.availableDate,
        daysRemaining: responseData?.daysRemaining,
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
          description:
            "Fallo de conexión con el Core del Banco. Intente nuevamente.",
          variant: "destructive",
        });
        setOfferResult({
          type: "ERROR_TECNICO",
          message: "Error técnico temporal de comunicación con centrales.",
        });
      } else {
        const alternativeAmount = Math.round(Number(simAmount) * 0.7);
        const term = Number(simTerm);
        // Caso 2: No viable con alternativa de cupo menor (33% probabilidad)
        if (random < 0.66) {
        setOfferResult({
          type: "NO_VIABLE",
          success: false,
          message: `Monto solicitado de $${Number(simAmount).toLocaleString("es-CO")} no es viable según perfil crediticio.`,
          offerDetails: {
            approvedAmount: alternativeAmount,
            interestRate: 1.85,
            termMonths: Math.min(term, 48),
          },
        });
        toast({
          title: "Oferta alternativa generada",
          description:
            "El monto solicitado no es viable, te ofrecemos una alternativa.",
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
            approvedAmount: Number(simAmount),
            interestRate: 1.45,
            termMonths: term,
          },
        });
        toast({
          title: "¡Felicitaciones! Oferta aprobada",
          description: "Tu solicitud ha sido pre-aprobada con éxito.",
        });
      }
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
    if (!offerResult || offerResult.type === "ERROR_TECNICO") return;

    if (isExistingCustomer) {
      // Cliente ya registrado: solo crear la aplicación con la oferta
      applicationRepository
        .create({
          clientId: document,
          channel,
          offerResult,
        })
        .then((data) => {
          toast({
            title: "¡Solicitud creada con éxito!",
            description: "La oferta ha sido asignada a tu solicitud.",
          });
          handleApplicationSuccess(data.id);
        })
        .catch((error: any) => {
          const responseData = error.response?.data;
          const msg = Array.isArray(responseData?.message) ? responseData.message[0] : responseData?.message || error.message;
          setGlobalError({
            message: msg,
            availableDate: responseData?.availableDate,
            daysRemaining: responseData?.daysRemaining,
          });
        });
    } else {
      // Cliente nuevo: registrar cliente y crear aplicación en una sola transacción
      if (!localRegistrationData) return;
      applyTransactionMutation.mutate({
        customerData: {
          ...localRegistrationData,
          document,
          channel,
        },
        offerResult,
      });
    }
  };

  const isWorking =
    validateMutation.isPending ||
    createApplicationDirect.isPending ||
    applyTransactionMutation.isPending;

  if (globalError) {
    return (
      <div className="bg-card rounded-lg border border-rose-200 shadow-sm p-8 md:p-10 transition-all duration-500 w-full animate-in fade-in zoom-in-95">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
            <svg
              className="w-8 h-8 text-rose-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-heading font-bold text-slate-800">
              Solicitud Restringida
            </h3>
            <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
              {globalError.message}
            </p>
          </div>
          {globalError.availableDate && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 w-full max-w-sm mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Fecha disponible para aplicar:
              </p>
              <p className="text-sm font-bold text-blue-600">
                {new Date(globalError.availableDate).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {globalError.daysRemaining !== undefined && (
                <p className="text-xs text-slate-400 mt-1">
                  (Faltan {globalError.daysRemaining} días)
                </p>
              )}
            </div>
          )}
          <Button
            onClick={() => {
              setGlobalError(null);
              setStep("VALIDATION");
            }}
            className="mt-6 h-11 px-8 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] p-8 md:p-10 transition-all duration-500 w-full animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-8">
        <h2 className="font-heading text-xl font-bold text-slate-800 tracking-tight">
          {step === "VALIDATION"
            ? "Solicítalo aquí"
            : step === "REGISTRATION"
              ? "Completa tu perfil"
              : "Evaluación Crediticia"}
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
                    value={field.value}
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Monto Solicitado
              </label>
              <Input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value ? Number(e.target.value) : "")}
                className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg text-md font-semibold transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]"
                placeholder="Ej. 5000000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Plazo de Pago
              </label>
              <Select
                onValueChange={(val) => setSimTerm(Number(val))}
                value={simTerm ? String(simTerm) : undefined}
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
              disabled={evaluationLoading || isWorking || !simAmount || !simTerm}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold font-heading shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                  <p className="text-[11px] text-rose-700">
                    {offerResult.message}
                  </p>
                </div>
              ) : (
                <div
                  className={`p-4 border rounded-lg space-y-3 ${offerResult.success ? "bg-emerald-50/30 border-emerald-100" : "bg-amber-50/30 border-amber-100"}`}
                >
                  <p
                    className={`font-bold text-xs ${offerResult.success ? "text-emerald-800" : "text-amber-800"}`}
                  >
                    {offerResult.success
                      ? "¡Oferta Aprobada!"
                      : "Propuesta Alternativa"}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {offerResult.message}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-center bg-white/60 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Monto Aprobado
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        $
                        {offerResult.offerDetails.approvedAmount.toLocaleString(
                          "es-CO",
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tasa (M.V.)
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {offerResult.offerDetails.interestRate}%
                      </span>
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
