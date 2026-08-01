import { api } from '@/lib/api';

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

export const applicationService = {
  create: async (data: CreateApplicationDto): Promise<Application> => {
    const response = await api.post<Application>('/applications', data);
    return response.data;
  },

  findAll: async (params?: PaginationDto): Promise<PaginatedResult<Application>> => {
    const response = await api.get<PaginatedResult<Application>>('/applications', { params });
    return response.data;
  },

  findById: async (id: string): Promise<Application> => {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateApplicationDto): Promise<Application> => {
    const response = await api.patch<Application>(`/applications/${id}`, data);
    return response.data;
  },

  simulateOffer: async (id: string, amount: number, termMonths: number): Promise<Application> => {
    const response = await api.post<Application>(`/applications/${id}/simulate-offer`, { amount, termMonths });
    return response.data;
  },

  finalize: async (id: string): Promise<Application> => {
    const response = await api.post<Application>(`/applications/${id}/finalize`);
    return response.data;
  },

  abandon: async (id: string, reason: string): Promise<Application> => {
    const response = await api.post<Application>(`/applications/${id}/abandon`, { reason });
    return response.data;
  },

  getEvents: async (id: string): Promise<ApplicationEvent[]> => {
    const response = await api.get<ApplicationEvent[]>(`/applications/${id}/events`);
    return response.data;
  },
};
