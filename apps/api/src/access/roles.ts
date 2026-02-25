import type { Access, FieldAccess } from 'payload'

type Role = 'super-admin' | 'supervisor' | 'auditor' | 'sales-rep' | 'programmer' | 'designer' | 'social-media-manager'

export const ADMIN_ROLES: Role[] = ['super-admin', 'supervisor', 'auditor']
export const MANAGEMENT_ROLES: Role[] = ['super-admin', 'supervisor']

function getUserRole(req: { user?: any }): Role | null {
  return req.user?.role || null
}

/** Check if user has one of the given roles */
export function hasRole(...roles: Role[]): Access {
  return ({ req }) => {
    const role = getUserRole(req)
    if (!role) return false
    return roles.includes(role)
  }
}

/** Admin roles OR user is accessing their own document */
export function hasRoleOrSelf(...roles: Role[]): Access {
  return ({ req }) => {
    const role = getUserRole(req)
    if (!role) return false
    if (roles.includes(role)) return true
    // Return query constraint: only own documents
    return { id: { equals: req.user?.id } }
  }
}

/** Any authenticated user */
export const isAuthenticated: Access = ({ req }) => {
  return !!req.user
}

/** Admin roles (super-admin, supervisor, auditor) */
export const isAdmin: Access = ({ req }) => {
  const role = getUserRole(req)
  if (!role) return false
  return ADMIN_ROLES.includes(role)
}

/** Management roles (super-admin, supervisor) */
export const isManagement: Access = ({ req }) => {
  const role = getUserRole(req)
  if (!role) return false
  return MANAGEMENT_ROLES.includes(role)
}

/** Super admin only */
export const isSuperAdmin: Access = ({ req }) => {
  return getUserRole(req) === 'super-admin'
}

/** Field-level: only management roles can edit */
export const managementFieldAccess: FieldAccess = ({ req }) => {
  const role = getUserRole(req)
  if (!role) return false
  return MANAGEMENT_ROLES.includes(role)
}

/** Admin roles see all, others see own documents via relationship field */
export function adminOrOwn(ownerField: string): Access {
  return ({ req }) => {
    const role = getUserRole(req)
    if (!role) return false
    if (ADMIN_ROLES.includes(role)) return true
    return { [ownerField]: { equals: req.user?.id } }
  }
}
