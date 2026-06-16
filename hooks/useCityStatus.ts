import { useMemo } from 'react';
import { Client, Purchase, CityStatus } from '../types';
import { STATUS_COLORS } from '../constants/colors';

type CityStatusMap = Map<string, CityStatus>;
type CityColorMap = Map<string, string>;

type UseCityStatusReturn = {
  getCityStatus: (cityCode: string) => CityStatus;
  getCityColor: (cityCode: string) => string;
  cityStatusMap: CityStatusMap;
  cityColorMap: CityColorMap;
};

export function useCityStatus(
  clients: Client[],
  purchases: Purchase[],
  collectionId: string | null
): UseCityStatusReturn {
  const cityStatusMap = useMemo<CityStatusMap>(() => {
    if (!collectionId) return new Map();

    const map = new Map<string, CityStatus>();

    // Agrupar clientes por código de cidade
    const clientsByCity = new Map<string, Client[]>();
    for (const client of clients) {
      const arr = clientsByCity.get(client.cityCode) || [];
      arr.push(client);
      clientsByCity.set(client.cityCode, arr);
    }

    // Filtrar compras desta coleção
    const collectionPurchases = purchases.filter(
      (p) => p.collectionId === collectionId && p.purchased === 1
    );
    const purchasedClientIds = new Set(collectionPurchases.map((p) => p.clientId));

    // Calcular status por cidade
    for (const [cityCode, cityClients] of clientsByCity) {
      if (cityClients.length === 0) {
        map.set(cityCode, 'no-clients');
        continue;
      }

      const boughtCount = cityClients.filter((c) => purchasedClientIds.has(c.id)).length;

      if (boughtCount === 0) {
        map.set(cityCode, 'none');
      } else if (boughtCount === cityClients.length) {
        map.set(cityCode, 'all');
      } else {
        map.set(cityCode, 'partial');
      }
    }

    return map;
  }, [clients, purchases, collectionId]);

  const cityColorMap = useMemo<CityColorMap>(() => {
    const map = new Map<string, string>();
    for (const [code, status] of cityStatusMap) {
      map.set(code, STATUS_COLORS[status]);
    }
    return map;
  }, [cityStatusMap]);

  const getCityStatus = (cityCode: string): CityStatus =>
    cityStatusMap.get(cityCode) || 'no-clients';

  const getCityColor = (cityCode: string): string =>
    cityColorMap.get(cityCode) || STATUS_COLORS['no-clients'];

  return { getCityStatus, getCityColor, cityStatusMap, cityColorMap };
}
