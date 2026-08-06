import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '../../core/api.client';
import { type StaffUser, staffUserSchema } from './users.model';

const KEY = ['admin', 'users'];

export function useStaffUsers() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<StaffUser[]>('/admin/users');
      return staffUserSchema.array().parse(data);
    },
  });
}

/**
 * A API responde 409 com a razão em `message` ("Já existe uma conta com este
 * e-mail.") e 403 nas regras de trava. Sem extrair isso, a tela cairia num
 * "não foi possível" genérico e o dono ficaria sem saber o que corrigir.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
  if (Array.isArray(message)) {
    return message[0] ?? fallback;
  }
  return message ?? fallback;
}

export function useCreateStaffUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string; role: string }) => {
      const { data } = await apiClient.post('/admin/users', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateStaffUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      role?: string;
      password?: string;
    }) => {
      const { data } = await apiClient.patch(`/admin/users/${id}`, patch);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteStaffUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/admin/users/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
