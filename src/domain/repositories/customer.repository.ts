import { Customer, CreateCustomerDto } from '../models/customer';

export interface ICustomerRepository {
  applyTransaction(data: { customerData: CreateCustomerDto; offerResult: any }): Promise<{ success: boolean; customer: Customer; application: any }>;
}
