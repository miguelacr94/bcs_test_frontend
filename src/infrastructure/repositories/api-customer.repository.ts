import { api } from '@/lib/api';
import { ICustomerRepository } from '@/domain/repositories/customer.repository';
import { Customer, CreateCustomerDto } from '@/domain/models/customer';

export class ApiCustomerRepository implements ICustomerRepository {
  async validateCustomer(document: string): Promise<Customer | null> {
    try {
      const response = await api.get<any>(`/customers/document/${document}`);
      const payload = response.data?.data || response.data;
      
      if (payload && payload.success === false) {
        return null; // Cliente no encontrado
      }
      
      return payload;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null; // Not found
      }
      throw error;
    }
  }

  async create(data: CreateCustomerDto): Promise<Customer> {
    const response = await api.post<Customer>('/customers', data);
    return response.data;
  }

  async applyTransaction(data: { customerData: CreateCustomerDto; offerResult: any }): Promise<{ success: boolean; customer: Customer; application: any }> {
    const response = await api.post<any>('/customers/apply', data);
    return response.data;
  }

  async findAll(filters?: { status?: string; channel?: string; searchTerm?: string }): Promise<{ data: Customer[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm);
    
    const response = await api.get<{ data: Customer[] }>(`/customers?${params.toString()}`);
    return response.data;
  }
}
