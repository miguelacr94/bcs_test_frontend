export enum ApplicationStatus {
  IN_PROGRESS = 'En Proceso',
  PENDING_VALIDATION = 'Pendiente Validación',
  FINALIZED = 'Finalizada',
  ABANDONED = 'Abandonada',
}

export interface ApplicationEvent {
  type: string;
  message: string;
  timestamp: string;
  metadata?: any;
}

export interface Application {
  id: string;
  clientId: string;
  channel: string;
  status: ApplicationStatus;
  createdAt: string;
  events: ApplicationEvent[];
  simulationResult?: any;
}

export interface CreateApplicationDto {
  clientId: string;
  channel: string;
}

export interface UpdateApplicationDto {
  status?: ApplicationStatus;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
  clientId?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}
