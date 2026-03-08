import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

// Lazy-load Sentry to avoid circular deps at startup
let _sentry: any = null
async function getSentry() {
    if (_sentry === undefined) return null
    if (_sentry) return _sentry
    try {
        _sentry = await import('@sentry/nextjs')
        return _sentry
    } catch {
        _sentry = undefined
        return null
    }
}

export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    ...(isDev
        ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            },
        }
        : {}),

    // Custom hook to send errors to Sentry
    hooks: {
        logMethod(inputArgs: any[], method: any, level: number) {
            // Pino level 50 = error, 60 = fatal
            if (level >= 50) {
                const lastArg = inputArgs[inputArgs.length - 1]
                const firstArg = inputArgs[0]
                const errObj = typeof firstArg === 'object' && firstArg?.err ? firstArg.err : null
                const message = typeof lastArg === 'string' ? lastArg : typeof firstArg === 'string' ? firstArg : 'Unknown error'

                // Fire-and-forget to Sentry
                getSentry().then((Sentry) => {
                    if (!Sentry) return
                    if (errObj instanceof Error) {
                        Sentry.captureException(errObj, {
                            extra: typeof firstArg === 'object' ? firstArg : undefined,
                        })
                    } else {
                        Sentry.captureMessage(message, {
                            level: level >= 60 ? 'fatal' : 'error',
                            extra: typeof firstArg === 'object' ? firstArg : undefined,
                        })
                    }
                }).catch(() => { })
            }
            method.apply(this, inputArgs)
        },
    },
})

/** Create a child logger for a specific module */
export function createLogger(module: string) {
    return logger.child({ module })
}
