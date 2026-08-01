import { api } from '@/lib/api';

export interface Customer {
  id: string;
  name: string;
  lastName: string;
  document: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface CreateCustomerDto {
  name: string;
  lastName: string;
  document: string;
  email: string;
  phone: string;
}

export const customerService = {
  validateCustomer: async (document: string): Promise<Customer | null> => {
    try {
      const response = await api.get<any>(`/customers/document/${document}`);
      
      // La API envuelve la respuesta o devuelve { success: false } directamente con un status 200
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
  },

  create: async (data: CreateCustomerDto): Promise<Customer> => {
    const response = await api.post<Customer>('/customers', data);
    return response.data;
  },
};
