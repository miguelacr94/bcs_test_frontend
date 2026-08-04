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
    const response = await api.post<PaginatedResult<Application>>('/applications/list', params || {});
    return response.data;
  }

  async findById(id: string): Promise<Application> {
    const response = await api.post<Application>(`/applications/get-by-id`, { id });
    return response.data;
  }

  async findByIdAdmin(id: string): Promise<Application> {
    const response = await api.post<Application>(`/applications/admin/get-by-id`, { id });
    return response.data;
  }

  async update(id: string, data: UpdateApplicationDto): Promise<Application> {
    const response = await api.post<Application>(`/applications/update`, { id, updateDto: data });
    return response.data;
  }

  async simulateOffer(id: string, amount: number, termMonths: number): Promise<Application> {
    const response = await api.post<Application>(`/applications/simulate-offer`, { id, simulateDto: { amount, termMonths } });
    return response.data;
  }

  async acceptOffer(id: string, channel?: string): Promise<Application> {
    const response = await api.post<Application>(`/applications/accept-offer`, { id, channel });
    return response.data;
  }

  async abandon(id: string, reason: string, channel?: string): Promise<Application> {
    const response = await api.post<Application>(`/applications/abandon`, { id, reasonDto: { reason, channel } });
    return response.data;
  }

  async getEvents(id: string): Promise<ApplicationEvent[]> {
    const response = await api.post<ApplicationEvent[]>(`/applications/events`, { id });
    return response.data;
  }

  async validate(id: string, validationData: any, channel?: string): Promise<any> {
    const response = await api.post(`/applications/validate`, { id, validationData: { ...validationData, channel } });
    return response.data;
  }

  async finalize(id: string, withDisbursement: boolean, channel?: string, reason?: string): Promise<any> {
    const response = await api.post(`/applications/finalize`, { id, withDisbursement, channel, reason });
    return response.data;
  }
}
