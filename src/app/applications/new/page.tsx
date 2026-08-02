import { ApplicationForm } from '@/components/applications/application-form';
import { CheckCircle2 } from 'lucide-react';

export default function NewApplicationPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-slate-50 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00a3ff]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#0066cc]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Columna Izquierda: Información y Beneficios (Solo Desktop o arriba en Mobile) */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 z-10">
        <div className="max-w-xl mx-auto md:mx-0">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#0066cc] mb-4 tracking-tight leading-none">
            Crédito Amigo <br className="hidden md:block" /> <span className="text-[#00a3ff]">Digital</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 font-medium mb-8 md:mb-12">
            Solicita tu financiación de manera simple, rápida y 100% segura.
          </p>

          <div className="space-y-4 md:space-y-6">
            <BenefitItem text="Solicitud 100% en línea" />
            <BenefitItem text="Tasa de interés entre 17.75% - 26.70% E.A.*" />
            <BenefitItem text="Seguro de vida incluido" />
            <BenefitItem text="Monto máximo aprobado de hasta $52.500.000" />
            <BenefitItem text="Plazos disponibles entre 12 y 60 meses" />
          </div>
          <p className="text-xs text-slate-400 mt-12 md:mt-16">
            *Tasa sujeta a políticas de crédito y perfil del solicitante.
          </p>
        </div>
      </div>

      {/* Columna Derecha: Formulario Flotante */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 z-10">
        <div className="w-full max-w-[420px]">
          <ApplicationForm />
        </div>
      </div>
    </main>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4">
      <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7 text-[#00a3ff] flex-shrink-0 drop-shadow-sm" />
      <span className="text-slate-700 text-lg md:text-xl font-medium">{text}</span>
    </div>
  );
}
