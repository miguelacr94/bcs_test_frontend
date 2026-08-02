export * from '@/infrastructure/repositories';
import { customerRepository } from '@/infrastructure/repositories';

export const customerService = customerRepository;
