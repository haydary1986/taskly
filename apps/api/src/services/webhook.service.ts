import type { Payload } from 'payload'
import crypto from 'crypto'
import { createLogger } from '../lib/logger'

const log = createLogger('webhook-service')

/**
 * Fire webhooks for a given event.
 * Non-blocking — errors are logged but don't propagate.
 */
export async function fireWebhook(
    payload: Payload,
    event: string,
    data: Record<string, any>,
): Promise<void> {
    try {
        const webhooks = await payload.find({
            collection: 'webhooks',
            where: {
                isActive: { equals: true },
                events: { contains: event },
            },
            limit: 50,
            overrideAccess: true,
        })

        if (webhooks.docs.length === 0) return

        const body = JSON.stringify({ event, data, timestamp: new Date().toISOString() })

        for (const webhook of webhooks.docs as any[]) {
            fireOne(webhook, body).catch((err) => {
                log.error({ err, webhookId: webhook.id, event }, 'Webhook delivery failed')
            })
        }
    } catch (err) {
        log.error({ err, event }, 'Failed to query webhooks')
    }
}

async function fireOne(webhook: any, body: string): Promise<void> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Taskly-Webhook/1.0',
    }

    // HMAC signature
    if (webhook.secret) {
        const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
        headers['X-Taskly-Signature'] = `sha256=${signature}`
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
        const res = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal,
        })

        if (!res.ok) {
            log.warn({ webhookId: webhook.id, status: res.status }, 'Webhook returned non-2xx')
            // Retry once after 3 seconds
            await new Promise((r) => setTimeout(r, 3000))
            await fetch(webhook.url, { method: 'POST', headers, body })
        }
    } finally {
        clearTimeout(timeout)
    }
}
