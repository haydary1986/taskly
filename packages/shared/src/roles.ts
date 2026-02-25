export const ROLES = {
  SUPER_ADMIN: 'super-admin',
  SUPERVISOR: 'supervisor',
  AUDITOR: 'auditor',
  SALES_REP: 'sales-rep',
  PROGRAMMER: 'programmer',
  DESIGNER: 'designer',
  SOCIAL_MEDIA: 'social-media-manager',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ADMIN_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.SUPERVISOR, ROLES.AUDITOR]
export const MANAGEMENT_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.SUPERVISOR]

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: 'مدير عام',
  [ROLES.SUPERVISOR]: 'مشرف',
  [ROLES.AUDITOR]: 'مراقب',
  [ROLES.SALES_REP]: 'مندوب مبيعات',
  [ROLES.PROGRAMMER]: 'مبرمج',
  [ROLES.DESIGNER]: 'مصمم',
  [ROLES.SOCIAL_MEDIA]: 'مسؤول سوشيال ميديا',
}

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  label,
  value,
}))
