"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customerRepository } from "@/infrastructure/repositories";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatRadicationDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    case "INACTIVE":
      return "bg-slate-50 text-slate-700 border-slate-200/80";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    case "BLOCKED":
      return "bg-rose-50 text-rose-700 border-rose-200/80";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200/80";
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "Activo";
    case "INACTIVE":
      return "Inactivo";
    case "PENDING":
      return "Pendiente";
    case "BLOCKED":
      return "Bloqueado";
    default:
      return status || "Desconocido";
  }
};

export function CustomerList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [channel, setChannel] = useState<string>("ALL");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customers", status, channel, searchTerm],
    queryFn: () =>
      customerRepository.findAll({
        ...(status !== "ALL" && { status }),
        ...(channel !== "ALL" && { channel }),
        ...(searchTerm && { searchTerm }),
      }),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-800 tracking-tight">
            Clientes
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestiona la información de los clientes registrados.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-slate-50/50 p-4 rounded-lg border border-border/40">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por documento, nombre o email..."
            className="pl-9 bg-white border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={status} onValueChange={(val) => setStatus(val || 'ALL')}>
            <SelectTrigger className="bg-white border-slate-200">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Estado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ACTIVE">Activo</SelectItem>
              <SelectItem value="INACTIVE">Inactivo</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="BLOCKED">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={channel} onValueChange={(val) => setChannel(val || 'ALL')}>
            <SelectTrigger className="bg-white border-slate-200">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Canal" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="DIGITAL">Digital</SelectItem>
              <SelectItem value="PHYSICAL">Físico</SelectItem>
              <SelectItem value="CALL_CENTER">Call Center</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <Table>
          <TableHeader className="bg-slate-50/75 border-b border-border/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-slate-600 h-12">
                Cliente
              </TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">
                Canal
              </TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">
                Fecha de Creación
              </TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">
                Estado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center h-32 text-slate-400 font-medium"
                >
                  Cargando clientes...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center h-32 text-rose-500 font-medium"
                >
                  Error al cargar los clientes. Verifica la conexión con el servidor.
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center h-32 text-slate-400 font-medium"
                >
                  No hay clientes registrados.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="hover:bg-slate-50/45 transition-colors border-b border-border/20"
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700">
                        {customer.name} {customer.lastName}
                      </span>
                      <span className="text-sm text-slate-500">
                        {customer.document}
                      </span>
                      <span className="text-xs text-slate-400">
                        {customer.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize font-medium text-slate-500">
                    {customer.channel?.toLowerCase() || '-'}
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium">
                    {formatRadicationDate(customer.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs px-2.5 py-1 font-semibold rounded-lg border ${getStatusColor(customer.status || '')}`}
                    >
                      {getStatusLabel(customer.status || '')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
