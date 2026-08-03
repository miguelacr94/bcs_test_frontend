import { api } from '@/lib/api';

export interface ValidationStatusResponse {
  isEligible: boolean;
  existsInDb: boolean;
  activeApplicationId: string | null;
}

export async function validateUserDocument(document: string): Promise<boolean> {
  try {
    await api.get(`/users/document/${document}`);
    return true;
  } catch (err: any) {
    if (err.response?.status === 404) {
      return false;
    }
    throw err;
  }
}

/**
 * Consulta el estado unificado del usuario en el gateway (API Composition).
 */
export async function validateUserStatus(document: string): Promise<ValidationStatusResponse> {
  const { data } = await api.get<ValidationStatusResponse>(`/users/validate/${document}`);
  return data;
}

