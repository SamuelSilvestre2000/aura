import { UserRole } from '../types';

export type Permission =
  | 'manage_clients'
  | 'manage_collections'
  | 'manage_users'
  | 'reset_database'
  | 'clear_geo_cache';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'manage_clients',
    'manage_collections',
    'manage_users',
    'reset_database',
    'clear_geo_cache',
  ],
  representative: ['manage_clients'],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  representative: 'Representante',
};
