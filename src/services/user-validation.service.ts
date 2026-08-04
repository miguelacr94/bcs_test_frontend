import { api } from '@/lib/api';

export interface ValidationStatusResponse {
  isEligible: boolean;
  existsInDb: boolean;
  activeApplicationId: string | null;
}

/**
 * Consulta el estado unificado del usuario en el gateway (API Composition).
 */
export async function validateUserStatus(document: string): Promise<ValidationStatusResponse> {
  const { data } = await api.post<ValidationStatusResponse>(`/users/validate`, { document });
  return data;
}
