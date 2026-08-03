import { ApplicationDetails } from '@/components/applications/application-details';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminApplicationDetailsPage() {
  return (
    <main className="flex-1 bg-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="space-y-6">
          <Link 
            href="/admin/applications" 
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Volver al Panel de Administración
          </Link>
          
          <ApplicationDetails />
        </div>
      </div>
    </main>
  );
}
