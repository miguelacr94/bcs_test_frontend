import { Customer, CreateCustomerDto } from '../models/customer';

export interface ICustomerRepository {
  validateCustomer(document: string): Promise<Customer | null>;
  create(data: CreateCustomerDto): Promise<Customer>;
  applyTransaction(data: { customerData: CreateCustomerDto; offerResult: any }): Promise<{ success: boolean; customer: Customer; application: any }>;
  findAll(filters?: { status?: string; channel?: string; searchTerm?: string }): Promise<{ data: Customer[] }>;
}
