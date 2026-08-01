'use client';

import Link from 'next/link';
import { Layers, UserCircle } from 'lucide-react';
import { useRole, Role } from '@/providers/role-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Navbar() {
  const { role, setRole } = useRole();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">
            BCS Motor
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Cliente</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
