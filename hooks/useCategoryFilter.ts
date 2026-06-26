import { useCallback, useEffect, useMemo, useState } from 'react';
import { Category } from '../types';
import { getAllowedCategoriesForUser } from '../services/categories';
import { useAuth } from './useAuth';
import {
  ALL_CATEGORIES_FILTER,
  allowedCategoryIdList,
  CategoryFilterValue,
  resolveEffectiveCategoryFilter,
  shouldShowCategorySwitcher,
} from '../utils/categoryFilter';

export function useCategoryFilter() {
  const { user, isAdmin } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<CategoryFilterValue>(ALL_CATEGORIES_FILTER);

  const loadCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      return;
    }
    setCategories(await getAllowedCategoriesForUser(user.id, user.role));
  }, [user]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const allowedCategoryIds = useMemo(() => allowedCategoryIdList(categories), [categories]);
  const showSwitcher = shouldShowCategorySwitcher(categories);
  const effectiveFilter = useMemo(
    () => resolveEffectiveCategoryFilter(filter, categories),
    [filter, categories]
  );

  return {
    categories,
    filter,
    setFilter,
    effectiveFilter,
    allowedCategoryIds,
    showSwitcher,
    isAdmin,
    refreshCategories: loadCategories,
  };
}
