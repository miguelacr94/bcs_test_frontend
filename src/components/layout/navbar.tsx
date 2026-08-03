'use client';

import Link from 'next/link';
import { Layers, UserCircle } from 'lucide-react';
import { useRole, Role } from '@/providers/role-provider';


export function Navbar() {
  const { role, setRole } = useRole();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-all hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-[#0066cc] to-[#00a3ff] text-white shadow-md shadow-[#0066cc]/25">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-heading text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-[#0066cc]">
            BCS <span className="text-[#00a3ff]">Digital</span>
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {role === 'ADMIN' ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1.5 rounded-lg border border-border/50 shadow-sm">
                  <UserCircle className="h-5 w-5 text-[#0066cc]" />
                  <span className="text-sm font-semibold text-slate-700">Admin</span>
                </div>
                <button 
                  onClick={() => {
                    localStorage.removeItem("auth_token");
                    setRole('CLIENT');
                    window.location.href = "/login";
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <Link 
                href="/login"
                className="text-sm font-semibold text-slate-500 hover:text-[#0066cc] transition-colors"
              >
                Acceso Administrador
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
