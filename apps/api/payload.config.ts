import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

// Collections
import { Users } from './src/collections/Users'
import { Media } from './src/collections/Media'
import { Projects } from './src/collections/Projects'
import { Tasks } from './src/collections/Tasks'
import { Notifications } from './src/collections/Notifications'
import { Clients } from './src/collections/Clients'
import { Visits } from './src/collections/Visits'
import { ChatRooms } from './src/collections/ChatRooms'
import { ChatMessages } from './src/collections/ChatMessages'
import { DesignRequests } from './src/collections/DesignRequests'
import { CodeReviews } from './src/collections/CodeReviews'
import { TimeEntries } from './src/collections/TimeEntries'
import { LoginLogs } from './src/collections/LoginLogs'
import { FirewallRules } from './src/collections/FirewallRules'
import { TaskComments } from './src/collections/TaskComments'
import { TaskActivities } from './src/collections/TaskActivities'
import { ProjectFiles } from './src/collections/ProjectFiles'
import { PushSubscriptions } from './src/collections/PushSubscriptions'
// CRM collections
import { Companies } from './src/collections/Companies'
import { Leads } from './src/collections/Leads'
import { Deals } from './src/collections/Deals'
import { Products } from './src/collections/Products'
import { CrmActivities } from './src/collections/CrmActivities'
import { Quotes } from './src/collections/Quotes'
import { Invoices } from './src/collections/Invoices'
import { ServiceRequests } from './src/collections/ServiceRequests'

// New collections
import { RefreshTokens } from './src/collections/RefreshTokens'
import { MagicTokens } from './src/collections/MagicTokens'
import { AuditLogs } from './src/collections/AuditLogs'
import { Webhooks } from './src/collections/Webhooks'

// Globals
import { SystemSettings } from './src/globals/SystemSettings'

// Seed
import { seedDemoData } from './src/seed/index'


// Original endpoints
import { dashboardStats } from './src/endpoints/dashboard-stats'
import { bulkAssignTasks } from './src/endpoints/bulk-assign-tasks'
import { checkIn, checkOut } from './src/endpoints/check-in'
import { kpiStats } from './src/endpoints/kpi'
import { exportReport } from './src/endpoints/reports'
import { magicLogin } from './src/endpoints/magic-login'
import { testTelegram, testEmail, telegramUsers } from './src/endpoints/system'
import { telegramLink, telegramStatus, telegramUnlink, telegramWebhook } from './src/endpoints/telegram'
import { pushSubscribe, pushUnsubscribe, pushVapidKey } from './src/endpoints/push'
import { toggleReaction, togglePin, onlineUsers } from './src/endpoints/chat'
import { dailyRoute } from './src/endpoints/daily-route'
import { salesToday } from './src/endpoints/sales-today'
import { visitToDeal, dealToQuote, quoteToInvoice } from './src/endpoints/pipeline'
import { dailyDigest, visitAlert } from './src/endpoints/smart-notifications'
import { repPerformance } from './src/endpoints/kpi-auto'

// New endpoints
import { refreshToken } from './src/endpoints/refresh-token'
import { verifyMagicLogin } from './src/endpoints/verify-magic-login'
import { setup2FA, verify2FA, disable2FA } from './src/endpoints/two-factor'
import { taskCalendar } from './src/endpoints/task-calendar'
import { inbox } from './src/endpoints/inbox'
import { dealsPipeline, crmStats, crmFunnel, convertLead, crmForecast, invoiceFromQuote, softDelete } from './src/endpoints/crm'
import { publicServices, requestService } from './src/endpoints/public-services'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

let dbUrl = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/taskly'
// Fix for Coolify internal MongoDB TLS cert missing
if (dbUrl.includes('/etc/mongo/certs/ca.pem')) {
  dbUrl = dbUrl.replace(/(\?|&)tls=true/g, '').replace(/(\?|&)tlsCAFile=\/etc\/mongo\/certs\/ca\.pem/g, '')
  if (dbUrl.endsWith('?')) dbUrl = dbUrl.slice(0, -1)
}

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Taskly | ALGO-NEST',
    },
  },

  collections: [
    Users,
    Media,
    Projects,
    Tasks,
    Notifications,
    Clients,
    Visits,
    ChatRooms,
    ChatMessages,
    DesignRequests,
    CodeReviews,
    TimeEntries,
    LoginLogs,
    FirewallRules,
    TaskComments,
    TaskActivities,
    ProjectFiles,
    PushSubscriptions,
    RefreshTokens,
    MagicTokens,
    AuditLogs,
    Webhooks,
    Companies,
    Leads,
    Deals,
    Products,
    CrmActivities,
    Quotes,
    Invoices,
    ServiceRequests,
  ],

  globals: [SystemSettings],

  endpoints: [
    // ── v1 endpoints ────────────────────────────────────
    { path: '/v1/kpi', method: 'get', handler: kpiStats },
    { path: '/v1/dashboard-stats', method: 'get', handler: dashboardStats },
    { path: '/v1/bulk-assign-tasks', method: 'post', handler: bulkAssignTasks },
    { path: '/v1/check-in', method: 'post', handler: checkIn },
    { path: '/v1/check-out', method: 'post', handler: checkOut },
    { path: '/v1/reports', method: 'get', handler: exportReport },
    { path: '/v1/magic-login', method: 'post', handler: magicLogin },
    { path: '/v1/verify-magic-login', method: 'post', handler: verifyMagicLogin },
    { path: '/v1/system/test-telegram', method: 'post', handler: testTelegram },
    { path: '/v1/system/test-email', method: 'post', handler: testEmail },
    { path: '/v1/system/telegram-users', method: 'get', handler: telegramUsers },
    { path: '/v1/telegram/link', method: 'post', handler: telegramLink },
    { path: '/v1/telegram/status', method: 'get', handler: telegramStatus },
    { path: '/v1/telegram/unlink', method: 'post', handler: telegramUnlink },
    { path: '/v1/telegram/webhook', method: 'post', handler: telegramWebhook },
    { path: '/v1/push/subscribe', method: 'post', handler: pushSubscribe },
    { path: '/v1/push/unsubscribe', method: 'post', handler: pushUnsubscribe },
    { path: '/v1/push/vapid-key', method: 'get', handler: pushVapidKey },
    { path: '/v1/chat/reaction', method: 'post', handler: toggleReaction },
    { path: '/v1/chat/pin', method: 'post', handler: togglePin },
    { path: '/v1/online-users', method: 'get', handler: onlineUsers },
    { path: '/v1/daily-route', method: 'get', handler: dailyRoute },
    { path: '/v1/refresh-token', method: 'post', handler: refreshToken },
    { path: '/v1/2fa/setup', method: 'post', handler: setup2FA },
    { path: '/v1/2fa/verify', method: 'post', handler: verify2FA },
    { path: '/v1/2fa/disable', method: 'post', handler: disable2FA },
    { path: '/v1/task-calendar', method: 'get', handler: taskCalendar },
    { path: '/v1/inbox', method: 'get', handler: inbox },
    { path: '/v1/crm/pipeline', method: 'get', handler: dealsPipeline },
    { path: '/v1/crm/stats', method: 'get', handler: crmStats },
    { path: '/v1/crm/funnel', method: 'get', handler: crmFunnel },
    { path: '/v1/crm/leads/convert', method: 'post', handler: convertLead },
    { path: '/v1/crm/forecast', method: 'get', handler: crmForecast },
    { path: '/v1/crm/invoices/from-quote', method: 'post', handler: invoiceFromQuote },
    { path: '/v1/crm/soft-delete', method: 'post', handler: softDelete },
    { path: '/v1/public/services', method: 'get', handler: publicServices },
    { path: '/v1/public/request-service', method: 'post', handler: requestService },

    // ── Legacy routes (backward compatibility) ──────────
    { path: '/kpi', method: 'get', handler: kpiStats },
    { path: '/dashboard-stats', method: 'get', handler: dashboardStats },
    { path: '/bulk-assign-tasks', method: 'post', handler: bulkAssignTasks },
    { path: '/check-in', method: 'post', handler: checkIn },
    { path: '/check-out', method: 'post', handler: checkOut },
    { path: '/reports', method: 'get', handler: exportReport },
    { path: '/magic-login', method: 'post', handler: magicLogin },
    { path: '/system/test-telegram', method: 'post', handler: testTelegram },
    { path: '/system/test-email', method: 'post', handler: testEmail },
    { path: '/system/telegram-users', method: 'get', handler: telegramUsers },
    { path: '/telegram/link', method: 'post', handler: telegramLink },
    { path: '/telegram/status', method: 'get', handler: telegramStatus },
    { path: '/telegram/unlink', method: 'post', handler: telegramUnlink },
    { path: '/telegram/webhook', method: 'post', handler: telegramWebhook },
    { path: '/push/subscribe', method: 'post', handler: pushSubscribe },
    { path: '/push/unsubscribe', method: 'post', handler: pushUnsubscribe },
    { path: '/push/vapid-key', method: 'get', handler: pushVapidKey },
    { path: '/chat/reaction', method: 'post', handler: toggleReaction },
    { path: '/chat/pin', method: 'post', handler: togglePin },
    { path: '/online-users', method: 'get', handler: onlineUsers },
    { path: '/daily-route', method: 'get', handler: dailyRoute },
    { path: '/sales-today', method: 'get', handler: salesToday },
    // Pipeline conversions
    { path: '/pipeline/visit-to-deal', method: 'post', handler: visitToDeal },
    { path: '/pipeline/deal-to-quote', method: 'post', handler: dealToQuote },
    { path: '/pipeline/quote-to-invoice', method: 'post', handler: quoteToInvoice },
    // Smart notifications
    { path: '/smart-notifications/daily-digest', method: 'get', handler: dailyDigest },
    { path: '/smart-notifications/visit-alert', method: 'post', handler: visitAlert },
    // Auto KPI
    { path: '/kpi/rep-performance', method: 'get', handler: repPerformance },
    { path: '/refresh-token', method: 'post', handler: refreshToken },
    { path: '/verify-magic-login', method: 'post', handler: verifyMagicLogin },
  ],

  editor: lexicalEditor(),

  secret: process.env.PAYLOAD_SECRET || 'default-secret-change-me',

  typescript: {
    outputFile: path.resolve(dirname, 'src/payload-types.ts'),
  },

  db: mongooseAdapter({
    url: dbUrl,
  }),

  sharp,


  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',

  cors: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  ].filter(Boolean),

  csrf: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  ].filter(Boolean),

  cookiePrefix: 'taskly',

  onInit: async (payload) => {
    try {
      await seedDemoData(payload)
    } catch (error) {
      payload.logger.error('Seed failed:', error)
    }
  },
})
