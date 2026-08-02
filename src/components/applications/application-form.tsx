"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationService, ApplicationStatus } from "@/services/application.service";
import { customerService } from "@/services/customer.service";
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
      applicationService.create({ clientId, channel: "Autogestionado" }),
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
    mutationFn: (doc: string) => customerService.validateCustomer(doc),
    onSuccess: async (customerData, doc) => {
      setDocument(doc);
      if (customerData) {
        try {
          // Cliente existe, consultar si ya tiene una solicitud activa en proceso
          const appsResult = await applicationService.findAll({ clientId: customerData.document });
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
      customerService.create(data),
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
    <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,102,204,0.1)] p-8 md:p-10 transition-all duration-500 w-full animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Solicítalo aquí</h2>
        <p className="text-slate-500 mt-1">
          {step === "VALIDATION" ? "Ingresa tus datos" : "Completa tu perfil"}
        </p>
      </div>

      {step === "VALIDATION" && (
        <Form {...validationForm}>
          <form
            onSubmit={validationForm.handleSubmit(onValidate)}
            className="space-y-5 animate-in fade-in zoom-in-95 duration-300"
          >
            <FormField
              control={validationForm.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 bg-transparent border-slate-200 focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc] rounded-xl text-slate-600">
                        <SelectValue placeholder="Tipo de documento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                      <SelectItem value="CE">Cédula de Extranjería</SelectItem>
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
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Número de documento" 
                      className="h-12 bg-transparent border-slate-200 focus:border-[#0066cc] focus-visible:ring-1 focus-visible:ring-[#0066cc] rounded-xl"
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-[#0066cc] focus:ring-[#0066cc] accent-[#0066cc] cursor-pointer"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-tight">
                    <FormLabel className="text-sm font-normal text-slate-600">
                      He leído y acepto el{" "}
                      <a href="#" className="text-[#0066cc] hover:underline">
                        tratamiento de datos personales
                      </a>{" "}
                      para los fines previstos en la autorización.
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isWorking}
              className="w-full h-14 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-xl text-lg font-semibold shadow-lg shadow-[#0066cc]/30 transition-all active:scale-[0.98]"
            >
              {isWorking ? (
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
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
            <div className="space-y-4">
              <FormField
                control={registrationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Nombres" className="h-12 rounded-xl" {...field} />
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
                      <Input placeholder="Apellidos" className="h-12 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={registrationForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="email" placeholder="Correo electrónico" className="h-12 rounded-xl" {...field} />
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
                    <Input type="tel" placeholder="Número de celular" className="h-12 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-[0.4] h-12 rounded-xl text-slate-500 hover:text-slate-800"
                onClick={() => setStep("VALIDATION")}
                disabled={isWorking}
              >
                Volver
              </Button>
              <Button
                type="submit"
                disabled={isWorking}
                className="flex-1 h-12 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-xl text-md font-semibold shadow-md shadow-[#0066cc]/30"
              >
                {isWorking ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
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
