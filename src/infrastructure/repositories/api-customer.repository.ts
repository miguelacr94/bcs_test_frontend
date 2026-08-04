import { api } from '@/lib/api';
import { ICustomerRepository } from '@/domain/repositories/customer.repository';
import { Customer, CreateCustomerDto } from '@/domain/models/customer';

export class ApiCustomerRepository implements ICustomerRepository {
  async applyTransaction(data: { customerData: CreateCustomerDto; offerResult: any }): Promise<{ success: boolean; customer: Customer; application: any }> {
    const response = await api.post<any>('/customers/apply', data);
    return response.data;
  }
}
