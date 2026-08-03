export interface Customer {
  id: string;
  name: string;
  lastName: string;
  document: string;
  email: string;
  phone: string;
  createdAt: string;
  channel?: string;
  status?: string;
}

export interface CreateCustomerDto {
  name: string;
  lastName: string;
  document: string;
  email: string;
  phone: string;
}
