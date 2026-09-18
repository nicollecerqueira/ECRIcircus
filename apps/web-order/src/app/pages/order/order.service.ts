import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api.client';
import { LOCATION_ID } from '../../core/config';
import { type Menu, menuSchema } from './order.model';

/**
 * Cardápio público. O cliente não tem JWT, então a API não consegue deduzir a
 * marca sozinha — e, por segurança, ela recusa devolver cardápio sem escopo em
 * vez de entregar o de qualquer marca. Sem QR de mesa, o escopo vem da config
 * (`LOCATION_ID`); a vitrine de delivery continua passando o slug da marca.
 */
export function useMenu(scope?: { brandSlug?: string }) {
  const params = scope?.brandSlug ? { brand: scope.brandSlug } : { location: LOCATION_ID };
  return useQuery({
    queryKey: ['menu', params],
    queryFn: async () => {
      const { data } = await apiClient.get<Menu>('/menu', { params });
      return menuSchema.parse(data);
    },
  });
}
