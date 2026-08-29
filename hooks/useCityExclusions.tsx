import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CityExclusion } from '../types';
import { DEFAULT_ORG_ID } from '../constants/organizations';
import {
  excludeCity as excludeCityService,
  includeCity as includeCityService,
  listCityExclusions,
} from '../services/cityExclusions';
import { useAuth } from './useAuth';

type CityExclusionsContextValue = {
  /** Códigos IBGE das cidades marcadas como inviáveis para a marca. */
  excludedCityCodes: Set<string>;
  loading: boolean;
  isCityExcluded: (cityCode: string) => boolean;
  setCityExcluded: (cityCode: string, excluded: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const CityExclusionsContext = createContext<CityExclusionsContextValue | null>(null);

/**
 * Contexto, e não hook solto: o mapa e o painel da cidade leem a mesma lista, e
 * o painel escreve nela. Com uma cópia por tela — como faz o useClients — o
 * mapa só descobriria a mudança ao reganhar foco, e o polígono continuaria
 * vermelho atrás do painel que acabou de marcar a cidade.
 */
export function CityExclusionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [exclusions, setExclusions] = useState<CityExclusion[]>([]);
  const [loading, setLoading] = useState(true);

  /*
    O User não carrega organização, e toda criação de cliente também grava em
    DEFAULT_ORG_ID (services/supabase/clients.ts). Usar a mesma constante mantém
    a exclusão no mesmo escopo dos dados que ela filtra; se a organização deixar
    de ser fixa, os dois lugares mudam juntos.
  */
  const organizationId = DEFAULT_ORG_ID;

  const load = useCallback(async () => {
    if (!user) {
      setExclusions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listCityExclusions(organizationId);
      setExclusions(data);
    } catch (err) {
      console.error('[useCityExclusions] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [user, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const excludedCityCodes = useMemo(
    () => new Set(exclusions.map((e) => e.cityCode)),
    [exclusions]
  );

  const isCityExcluded = useCallback(
    (cityCode: string) => excludedCityCodes.has(cityCode),
    [excludedCityCodes]
  );

  const setCityExcluded = useCallback(
    async (cityCode: string, excluded: boolean) => {
      if (!user) return;

      /*
        O mapa reage antes da rede responder: o interruptor é uma afirmação
        sobre a cidade, não um pedido a confirmar. Se falhar, recarrega do banco
        e o estado volta sozinho para o que é verdade.
      */
      setExclusions((prev) =>
        excluded
          ? prev.some((e) => e.cityCode === cityCode)
            ? prev
            : [
                ...prev,
                {
                  id: `otimista_${cityCode}`,
                  organizationId,
                  cityCode,
                  createdAt: new Date().toISOString(),
                  createdBy: user.id,
                },
              ]
          : prev.filter((e) => e.cityCode !== cityCode)
      );

      try {
        if (excluded) {
          await excludeCityService(cityCode, organizationId, null, user.id);
        } else {
          await includeCityService(cityCode, organizationId, null);
        }
      } catch (err) {
        console.error('[useCityExclusions] Erro ao salvar:', err);
      } finally {
        await load();
      }
    },
    [user, organizationId, load]
  );

  const value = useMemo(
    () => ({ excludedCityCodes, loading, isCityExcluded, setCityExcluded, refresh: load }),
    [excludedCityCodes, loading, isCityExcluded, setCityExcluded, load]
  );

  return (
    <CityExclusionsContext.Provider value={value}>{children}</CityExclusionsContext.Provider>
  );
}

export function useCityExclusions(): CityExclusionsContextValue {
  const ctx = useContext(CityExclusionsContext);
  if (!ctx) throw new Error('useCityExclusions precisa estar dentro de CityExclusionsProvider');
  return ctx;
}
