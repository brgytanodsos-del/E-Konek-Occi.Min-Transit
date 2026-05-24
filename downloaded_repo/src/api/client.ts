import { ApiResponse } from '../types/api';

export async function api<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Get token if needed from storage
  const token = localStorage.getItem('auth_token');

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Error occurred');
  }

  const result: ApiResponse<T> = await response.json();
  
  if (!result.success) {
      throw new Error(result.error || 'API Request unsuccessful');
  }

  return result.data as T;
}
