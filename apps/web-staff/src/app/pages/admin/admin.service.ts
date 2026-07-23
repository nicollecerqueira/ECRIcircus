import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api.client';
import { type Category, categorySchema } from './admin.model';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<Category[]>('/admin/categories');
      return categorySchema.array().parse(data);
    },
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      priceCents: number;
      categoryId: string;
      stationId: string;
    }) => {
      const { data } = await apiClient.post('/admin/menu', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      ...patch
    }: {
      itemId: string;
      name?: string;
      priceCents?: number;
      available?: boolean;
      /** `null` remove a promoção; `undefined` deixa como está. */
      promoPriceCents?: number | null;
      promoEndsAt?: string | null;
    }) => {
      const { data } = await apiClient.patch(`/admin/menu/${itemId}`, patch);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data } = await apiClient.delete(`/admin/menu/${itemId}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
}
