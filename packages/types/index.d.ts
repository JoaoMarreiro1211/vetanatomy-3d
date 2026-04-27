export type ID = string | number;

export interface User {
  id: ID;
  email: string;
  fullName?: string;
  isActive: boolean;
  isSuperuser: boolean;
}
