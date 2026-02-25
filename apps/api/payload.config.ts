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

// Globals
import { SystemSettings } from './src/globals/SystemSettings'

// Seed
import { seedDemoData } from './src/seed'

// Endpoints
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
import { PushSubscriptions } from './src/collections/PushSubscriptions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

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
    PushSubscriptions,
    TaskComments,
    TaskActivities,
    ProjectFiles,
  ],

  globals: [SystemSettings],

  endpoints: [
    { path: '/dashboard-stats', method: 'get', handler: dashboardStats },
    { path: '/bulk-assign-tasks', method: 'post', handler: bulkAssignTasks },
    { path: '/check-in', method: 'post', handler: checkIn },
    { path: '/check-out', method: 'post', handler: checkOut },
    { path: '/kpi', method: 'get', handler: kpiStats },
    { path: '/reports/export', method: 'get', handler: exportReport },
    { path: '/magic-login', method: 'post', handler: magicLogin },
    { path: '/test-telegram', method: 'post', handler: testTelegram },
    { path: '/test-email', method: 'post', handler: testEmail },
    { path: '/telegram-users', method: 'get', handler: telegramUsers },
    { path: '/telegram-link', method: 'get', handler: telegramLink },
    { path: '/telegram-status', method: 'get', handler: telegramStatus },
    { path: '/telegram-webhook', method: 'post', handler: telegramWebhook },
    { path: '/telegram-unlink', method: 'post', handler: telegramUnlink },
    { path: '/push-subscribe', method: 'post', handler: pushSubscribe },
    { path: '/push-unsubscribe', method: 'post', handler: pushUnsubscribe },
    { path: '/push-vapid-key', method: 'get', handler: pushVapidKey },
    { path: '/chat-react', method: 'post', handler: toggleReaction },
    { path: '/chat-pin', method: 'post', handler: togglePin },
    { path: '/online-users', method: 'get', handler: onlineUsers },
    { path: '/daily-route', method: 'get', handler: dailyRoute },
  ],

  editor: lexicalEditor(),

  secret: process.env.PAYLOAD_SECRET || 'default-secret-change-me',

  typescript: {
    outputFile: path.resolve(dirname, 'src/payload-types.ts'),
  },

  db: mongooseAdapter({
    url: process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/taskly',
  }),

  sharp,

  onInit: async (payload) => {
    await seedDemoData(payload)
  },

  cors: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
  ],

  csrf: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
  ],
})
