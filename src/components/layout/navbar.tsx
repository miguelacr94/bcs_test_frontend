'use client';

import Link from 'next/link';
import { Layers, UserCircle } from 'lucide-react';
import { useRole, Role } from '@/providers/role-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Navbar() {
  const { role, setRole } = useRole();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-all hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0066cc] to-[#00a3ff] text-white shadow-md shadow-[#0066cc]/25">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-heading text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-[#0066cc]">
            BCS <span className="text-[#00a3ff]">Digital</span>
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <div className="flex items-center gap-3 bg-secondary/80 px-3 py-1.5 rounded-2xl border border-border/50 shadow-sm">
              <UserCircle className="h-5 w-5 text-[#0066cc]" />
              <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                <SelectTrigger className="h-7 w-[110px] text-xs bg-transparent border-0 shadow-none focus:ring-0 focus:ring-offset-0 px-1 py-0 font-semibold text-slate-700">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="CLIENT" className="rounded-lg">Cliente</SelectItem>
                  <SelectItem value="ADMIN" className="rounded-lg">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
