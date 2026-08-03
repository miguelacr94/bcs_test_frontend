import { ApplicationForm } from '@/components/applications/application-form';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function ApplyPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00a3ff]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#0066cc]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 flex flex-col items-center px-6 py-10 md:py-16 z-10">
        <div className="w-full max-w-lg space-y-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Volver al inicio
          </Link>

          <div className="text-center space-y-1">
            <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-[#0066cc] tracking-tight">
              Solicitud de Crédito
            </h1>
            <p className="text-sm text-slate-500">
              Ingresa tu documento para iniciar o continuar tu proceso.
            </p>
          </div>

          <ApplicationForm />
        </div>
      </div>
    </main>
  );
}
