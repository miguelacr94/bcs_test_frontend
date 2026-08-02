"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationRepository, customerRepository, ApplicationStatus } from "@/infrastructure/repositories";
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
import { Loader2 } from "lucide-react";

const validationSchema = z.object({
  documentType: z.string().min(1, "Selecciona un tipo"),
  document: z.string().min(5, "Documento inválido"),
  terms: z.boolean().refine((val) => val === true, "Debes aceptar los términos"),
});

const registrationSchema = z.object({
  name: z.string().min(2, "Obligatorio"),
  lastName: z.string().min(2, "Obligatorio"),
  email: z.string().email("Inválido"),
  phone: z.string().min(7, "Inválido"),
});

type Step = "VALIDATION" | "REGISTRATION";

export function ApplicationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("VALIDATION");
  const [document, setDocument] = useState("");

  const validationForm = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: { documentType: "", document: "", terms: false },
  });

  const registrationForm = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", lastName: "", email: "", phone: "" },
  });

  // Mutación para Crear Solicitud (Directa, siempre Autogestionado)
  const createApplication = useMutation({
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

  // Mutación para Validar (Si existe, busca si tiene solicitud activa. Si no, pasa a registro)
  const validateMutation = useMutation({
    mutationFn: (doc: string) => customerRepository.validateCustomer(doc),
    onSuccess: async (customerData, doc) => {
      setDocument(doc);
      if (customerData) {
        try {
          // Cliente existe, consultar si ya tiene una solicitud activa en proceso
          const appsResult = await applicationRepository.findAll({ clientId: customerData.document });
          const activeApp = appsResult.data?.find(
            (app) =>
              app.status === ApplicationStatus.IN_PROGRESS ||
              app.status === ApplicationStatus.PENDING_VALIDATION
          );

          if (activeApp) {
            toast({
              title: "¡Solicitud en curso encontrada!",
              description: "Te estamos redirigiendo para que continúes con tu proceso.",
            });
            router.push(`/applications/${activeApp.id}`);
          } else {
            // No tiene solicitud activa, crear una nueva
            createApplication.mutate(customerData.document);
          }
        } catch (err) {
          // Si falla la búsqueda por alguna razón, procedemos a intentar crear una nueva
          createApplication.mutate(customerData.document);
        }
      } else {
        // Cliente no existe, pedir datos
        setStep("REGISTRATION");
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

  // Mutación para Registrar
  const registerMutation = useMutation({
    mutationFn: (data: z.infer<typeof registrationSchema> & { document: string }) =>
      customerRepository.create(data),
    onSuccess: (newCustomer) => {
      // Cliente creado, crear solicitud
      createApplication.mutate(newCustomer.document);
    },
    onError: () => {
      toast({
        title: "Error de registro",
        description: "Hubo un problema al crear tu perfil.",
        variant: "destructive",
      });
    },
  });

  const onValidate = (values: z.infer<typeof validationSchema>) => {
    validateMutation.mutate(values.document);
  };

  const onRegister = (values: z.infer<typeof registrationSchema>) => {
    registerMutation.mutate({ ...values, document });
  };

  const isWorking = validateMutation.isPending || createApplication.isPending || registerMutation.isPending;

  return (
    <div className="bg-card rounded-lg border border-primary/20 shadow-[0_16px_40px_rgba(0,102,204,0.06)] p-8 md:p-10 transition-all duration-500 w-full animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-8">
        <h2 className="font-heading text-xl font-bold text-slate-800 tracking-tight">
          {step === "VALIDATION" ? "Solicítalo aquí" : "Completa tu perfil"}
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {step === "VALIDATION" ? "Ingresa tus datos para comenzar" : "Completa los siguientes campos"}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-lg text-slate-700 font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]">
                        <SelectValue placeholder="Tipo de documento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-lg shadow-lg border border-primary/10">
                      <SelectItem value="CC" className="rounded-md">Cédula de Ciudadanía</SelectItem>
                      <SelectItem value="CE" className="rounded-md">Cédula de Extranjería</SelectItem>
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
                      <a href="#" className="text-primary hover:underline font-semibold">
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
                      <Input placeholder="Nombres" className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]" {...field} />
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
                      <Input placeholder="Apellidos" className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]" {...field} />
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
                      <Input type="email" placeholder="Correo electrónico" className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]" {...field} />
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
                      <Input type="tel" placeholder="Número de celular" className="h-11 w-full bg-transparent border-primary/30 hover:border-primary/60 focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium transition-all shadow-[0_2px_6px_rgba(0,102,204,0.04)]" {...field} />
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
    </div>
  );
}
