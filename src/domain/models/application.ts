export enum ApplicationStatus {
  IN_PROGRESS = 'En Proceso',
  PENDING_VALIDATION = 'Pendiente Validación',
  FINALIZED = 'Finalizada',
  ABANDONED = 'Abandonada',
}

export interface ApplicationEvent {
  _id?: string;
  offerId?: string;
  type: string;
  message: string;
  createdAt: string;
  previousStatus?: string;
  nextStatus?: string;
  metadata?: any;
}

export interface Customer {
  name: string;
  lastName: string;
  document: string;
  email?: string;
  phone?: string;
}

export interface Application {
  id: string;
  radicado: string;
  clientId: string;
  channel: string;
  status: ApplicationStatus;
  createdAt: string;
  events: ApplicationEvent[];
  offerResult?: any;
  customer?: Customer;
  statusReason?: string;
}

export interface CreateApplicationDto {
  clientId: string;
  channel: string;
  offerResult?: any;
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
