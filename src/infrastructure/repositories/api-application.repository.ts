import { api } from '@/lib/api';
import { IApplicationRepository } from '@/domain/repositories/application.repository';
import { 
  Application, 
  CreateApplicationDto, 
  UpdateApplicationDto, 
  PaginationDto, 
  PaginatedResult, 
  ApplicationEvent 
} from '@/domain/models/application';

export class ApiApplicationRepository implements IApplicationRepository {
  async create(data: CreateApplicationDto): Promise<Application> {
    const response = await api.post<Application>('/applications', data);
    return response.data;
  }

  async findAll(params?: PaginationDto): Promise<PaginatedResult<Application>> {
    const response = await api.get<PaginatedResult<Application>>('/applications', { params });
    return response.data;
  }

  async findById(id: string): Promise<Application> {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  }

  async update(id: string, data: UpdateApplicationDto): Promise<Application> {
    const response = await api.patch<Application>(`/applications/${id}`, data);
    return response.data;
  }

  async simulateOffer(id: string, amount: number, termMonths: number): Promise<Application> {
    const response = await api.post<Application>(`/applications/${id}/simulate-offer`, { amount, termMonths });
    return response.data;
  }

  async acceptOffer(id: string, channel?: string): Promise<Application> {
    const response = await api.post<Application>(`/applications/${id}/accept-offer`, { channel });
    return response.data;
  }

  async abandon(id: string, reason: string, channel?: string): Promise<Application> {
    const response = await api.post<Application>(`/applications/${id}/abandon`, { reason, channel });
    return response.data;
  }

  async getEvents(id: string): Promise<ApplicationEvent[]> {
    const response = await api.get<ApplicationEvent[]>(`/applications/${id}/events`);
    return response.data;
  }

  async validate(id: string, validationData: any, channel?: string): Promise<any> {
    const response = await api.post(`/applications/${id}/validate`, { ...validationData, channel });
    return response.data;
  }

  async finalize(id: string, withDisbursement: boolean, channel?: string): Promise<any> {
    const response = await api.post(`/applications/${id}/finalize`, { withDisbursement, channel });
    return response.data;
  }
}
