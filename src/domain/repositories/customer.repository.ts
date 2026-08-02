import { Customer, CreateCustomerDto } from '../models/customer';

export interface ICustomerRepository {
  validateCustomer(document: string): Promise<Customer | null>;
  create(data: CreateCustomerDto): Promise<Customer>;
}
