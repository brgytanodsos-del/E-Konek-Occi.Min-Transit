export type UserRole = 'superadmin' | 'terminal-admin' | 'dispatcher' | 'passenger';

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
}
