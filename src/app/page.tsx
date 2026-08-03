import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00a3ff]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#0066cc]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-16 md:py-24 z-10">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold text-[#0066cc] tracking-tight leading-none">
            Crédito Amigo <br className="hidden md:block" /> <span className="text-[#00a3ff]">Digital</span>
          </h1>
          <p className="text-lg md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto">
            Solicita tu financiación de manera simple, rápida y 100% segura.
          </p>

          {/* Single CTA */}
          <div className="mt-10 flex justify-center">
            <Link href="/apply">
              <Button
                size="lg"
                className="h-14 px-10 text-base bg-[#0066cc] hover:bg-[#0055aa] text-white font-bold rounded-2xl shadow-lg shadow-[#0066cc]/20 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2"
              >
                <Zap className="h-5 w-5" />
                Comenzar ahora
                <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-4 mt-16 max-w-4xl mx-auto">
            <BenefitItem text="Solicitud 100% en línea" />
            <BenefitItem text="Tasa competitiva" />
            <BenefitItem text="Seguro de vida incluido" />
          </div>
        </div>
      </div>
    </main>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-3 text-slate-700 font-medium">
      <div className="w-2 h-2 bg-[#00a3ff] rounded-full" />
      <span>{text}</span>
    </div>
  );
}
