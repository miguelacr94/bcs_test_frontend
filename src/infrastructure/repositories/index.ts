import { ApiApplicationRepository } from './api-application.repository';
import { ApiCustomerRepository } from './api-customer.repository';

export const applicationRepository = new ApiApplicationRepository();
export const customerRepository = new ApiCustomerRepository();

export * from '@/domain/models/application';
export * from '@/domain/models/customer';
