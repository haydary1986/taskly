import type { Payload } from 'payload'
import { createLogger } from './logger'

const log = createLogger('audit')

interface AuditEntry {
    userId?: string
    action: 'create' | 'update' | 'delete' | 'soft-delete' | 'restore' | 'transfer' | 'login' | 'logout'
    collectionName: string
    documentId?: string
    changes?: Record<string, any>
    ip?: string
}

/** Log an audit entry — non-blocking, errors are caught silently */
export async function logAudit(payload: Payload, entry: AuditEntry): Promise<void> {
    try {
        await payload.create({
            collection: 'audit-logs',
            data: {
                user: entry.userId || undefined,
                action: entry.action,
                collectionName: entry.collectionName,
                documentId: entry.documentId,
                changes: entry.changes,
                ip: entry.ip,
            },
            overrideAccess: true,
        })
    } catch (err) {
        log.error({ err, entry }, 'Failed to write audit log')
    }
}

/**
 * Compute a diff between two objects for audit logging.
 * Returns only the changed fields.
 */
export function computeChanges(
    previousDoc: Record<string, any>,
    newDoc: Record<string, any>,
    fields: string[],
): Record<string, { from: any; to: any }> | null {
    const changes: Record<string, { from: any; to: any }> = {}

    for (const field of fields) {
        const prev = previousDoc[field]
        const next = newDoc[field]
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
            changes[field] = { from: prev, to: next }
        }
    }

    return Object.keys(changes).length > 0 ? changes : null
}
