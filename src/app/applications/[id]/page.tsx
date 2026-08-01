import { ApplicationDetails } from '@/components/applications/application-details';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ApplicationDetailsPage() {
  return (
    <main className="flex-1 bg-gradient-to-br from-background to-muted/50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Volver al Inicio
        </Link>
        
        <ApplicationDetails />
      </div>
    </main>
  );
}
