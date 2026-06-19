import { Client, Purchase, Sale } from '../types';
import { COLORS } from '../constants/colors';

export type CollectionProgress = {
  bought: number;
  pending: number;
  total: number;
  clientPercent: number;
  completedCities: number;
  totalCities: number;
  cityPercent: number;
};

export type BoughtClientRow = {
  client: Client;
  sale?: Sale;
  purchasedAt?: string;
};

export function progressColor(percent: number): string {
  if (percent >= 100) return COLORS.success;
  if (percent >= 50) return COLORS.warning;
  return COLORS.error;
}

/** Cores mais escuras para barras sobre fundo verde (coleção vigente). */
export function progressColorOnTintedBg(percent: number): string {
  if (percent >= 100) return '#2F6B4F';
  if (percent >= 50) return '#9A5510';
  return '#A83832';
}

export function getCollectionProgress(
  collectionId: string,
  clients: Client[],
  purchases: Purchase[]
): CollectionProgress {
  if (clients.length === 0) {
    return {
      bought: 0,
      pending: 0,
      total: 0,
      clientPercent: 0,
      completedCities: 0,
      totalCities: 0,
      cityPercent: 0,
    };
  }

  const collectionPurchases = purchases.filter(
    (p) => p.collectionId === collectionId && p.purchased === 1
  );
  const boughtClientIds = new Set(collectionPurchases.map((p) => p.clientId));
  const bought = clients.filter((c) => boughtClientIds.has(c.id)).length;
  const pending = clients.length - bought;
  const clientPercent = Math.round((bought / clients.length) * 100);

  const cityCodes = [...new Set(clients.map((c) => c.cityCode))];
  const completedCities = cityCodes.filter((code) => {
    const cityClients = clients.filter((c) => c.cityCode === code);
    return cityClients.every((c) => boughtClientIds.has(c.id));
  }).length;
  const cityPercent =
    cityCodes.length > 0 ? Math.round((completedCities / cityCodes.length) * 100) : 0;

  return {
    bought,
    pending,
    total: clients.length,
    clientPercent,
    completedCities,
    totalCities: cityCodes.length,
    cityPercent,
  };
}

export function getBoughtClientsForCollection(
  collectionId: string,
  clients: Client[],
  purchases: Purchase[],
  sales: Sale[]
): BoughtClientRow[] {
  const boughtIds = new Set(
    purchases
      .filter((p) => p.collectionId === collectionId && p.purchased === 1)
      .map((p) => p.clientId)
  );

  return clients
    .filter((c) => boughtIds.has(c.id))
    .map((client) => {
      const purchase = purchases.find(
        (p) => p.clientId === client.id && p.collectionId === collectionId
      );
      const sale = sales.find(
        (s) => s.clientId === client.id && s.collectionId === collectionId
      );
      return {
        client,
        sale,
        purchasedAt: sale?.soldAt ?? purchase?.purchasedAt,
      };
    })
    .sort((a, b) => {
      const amountDiff = (b.sale?.amount ?? 0) - (a.sale?.amount ?? 0);
      if (amountDiff !== 0) return amountDiff;
      return a.client.name.localeCompare(b.client.name, 'pt-BR');
    });
}
