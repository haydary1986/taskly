import type { Payload } from 'payload'

const DEMO_PASSWORD = 'demo1234'

const demoUsers = [
  { name: 'أحمد المدير', email: 'admin@algo-nest.com', role: 'super-admin' as const, phone: '0501234567' },
  { name: 'سارة المشرفة', email: 'supervisor@algo-nest.com', role: 'supervisor' as const, phone: '0502345678' },
  { name: 'خالد المراقب', email: 'auditor@algo-nest.com', role: 'auditor' as const, phone: '0503456789' },
  { name: 'محمد المندوب', email: 'sales@algo-nest.com', role: 'sales-rep' as const, phone: '0504567890' },
  { name: 'فاطمة المبرمجة', email: 'dev@algo-nest.com', role: 'programmer' as const, phone: '0505678901' },
  { name: 'نورة المصممة', email: 'designer@algo-nest.com', role: 'designer' as const, phone: '0506789012' },
  { name: 'ليلى السوشيال', email: 'social@algo-nest.com', role: 'social-media-manager' as const, phone: '0507890123' },
]

export async function seedDemoData(payload: Payload) {
  // Check if already seeded
  const { totalDocs } = await payload.count({ collection: 'users' })
  if (totalDocs > 0) {
    payload.logger.info('— Seed: Users already exist, skipping seed.')
    return
  }

  payload.logger.info('— Seed: Creating demo users...')

  // Create users
  const createdUsers: Record<string, string> = {}
  for (const u of demoUsers) {
    const user = await payload.create({
      collection: 'users',
      data: { ...u, password: DEMO_PASSWORD, isActive: true } as any,
      overrideAccess: true,
    })
    createdUsers[u.role] = user.id
    payload.logger.info(`  ✓ ${u.role}: ${u.email}`)
  }

  const adminId = createdUsers['super-admin']
  const supervisorId = createdUsers['supervisor']
  const salesId = createdUsers['sales-rep']
  const devId = createdUsers['programmer']
  const designerId = createdUsers['designer']
  const socialId = createdUsers['social-media-manager']

  // Create projects
  payload.logger.info('— Seed: Creating demo projects...')

  const project1 = await payload.create({
    collection: 'projects',
    data: {
      name: 'تطوير تطبيق الموبايل',
      description: 'تطوير تطبيق موبايل لإدارة المبيعات الميدانية',
      status: 'active',
      estimatedHours: 200,
      startDate: '2026-01-15',
      endDate: '2026-04-30',
      manager: adminId,
      members: [devId, designerId, supervisorId],
    },
    overrideAccess: true,
  })

  const project2 = await payload.create({
    collection: 'projects',
    data: {
      name: 'حملة تسويقية Q1',
      description: 'حملة تسويقية للربع الأول من 2026',
      status: 'active',
      estimatedHours: 80,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      manager: supervisorId,
      members: [socialId, designerId, salesId],
    },
    overrideAccess: true,
  })

  const project3 = await payload.create({
    collection: 'projects',
    data: {
      name: 'ترقية الخوادم',
      description: 'ترقية وتحديث البنية التحتية للخوادم',
      status: 'planning',
      estimatedHours: 40,
      startDate: '2026-03-01',
      endDate: '2026-03-15',
      manager: adminId,
      members: [devId],
    },
    overrideAccess: true,
  })

  // Create tasks
  payload.logger.info('— Seed: Creating demo tasks...')

  const tasks = [
    { title: 'تصميم واجهة تسجيل الدخول', type: 'design', status: 'completed', priority: 'high', assignee: designerId, project: project1.id, dueDate: '2026-02-01' },
    { title: 'برمجة API المصادقة', type: 'programming', status: 'completed', priority: 'urgent', assignee: devId, project: project1.id, dueDate: '2026-02-10', githubRepo: 'algo-nest/mobile-app', githubBranch: 'feat/auth-api' },
    { title: 'تطوير شاشة لوحة التحكم', type: 'programming', status: 'in-progress', priority: 'high', assignee: devId, project: project1.id, dueDate: '2026-03-01', githubRepo: 'algo-nest/mobile-app', githubBranch: 'feat/dashboard' },
    { title: 'تصميم شعار الحملة', type: 'design', status: 'in-review', priority: 'medium', assignee: designerId, project: project2.id, dueDate: '2026-02-15' },
    { title: 'زيارة شركة الفجر للتقنية', type: 'field-visit', status: 'new', priority: 'high', assignee: salesId, dueDate: '2026-02-25' },
    { title: 'زيارة مؤسسة النور', type: 'field-visit', status: 'new', priority: 'medium', assignee: salesId, dueDate: '2026-02-26' },
    { title: 'إعداد محتوى انستقرام', type: 'general', status: 'in-progress', priority: 'medium', assignee: socialId, project: project2.id, dueDate: '2026-02-28' },
    { title: 'مراجعة كود الـ API', type: 'programming', status: 'new', priority: 'low', assignee: devId, project: project1.id, dueDate: '2026-03-05', githubRepo: 'algo-nest/mobile-app', githubBranch: 'refactor/api-cleanup' },
    { title: 'تصميم بوستات فيسبوك', type: 'design', status: 'new', priority: 'medium', assignee: designerId, project: project2.id, dueDate: '2026-03-01' },
    { title: 'إعداد خطة النشر', type: 'general', status: 'new', priority: 'low', assignee: socialId, project: project2.id, dueDate: '2026-03-10' },
    { title: 'اختبار التطبيق على iOS', type: 'programming', status: 'new', priority: 'urgent', assignee: devId, project: project1.id, dueDate: '2026-03-15' },
    { title: 'تقرير المبيعات الشهري', type: 'general', status: 'completed', priority: 'high', assignee: salesId, dueDate: '2026-02-01' },
  ]

  for (const t of tasks) {
    await payload.create({
      collection: 'tasks',
      data: { ...t, assignedBy: adminId } as any,
      overrideAccess: true,
    })
  }

  // Create clients
  payload.logger.info('— Seed: Creating demo clients...')

  const clients = [
    { name: 'شركة الفجر للتقنية', phone: '07701234567', city: 'بغداد', address: 'الكرادة، شارع أبو نواس', tags: ['vip', 'regular'] as string[], location: [44.3661, 33.3152] as [number, number], uuid: 'CLT-001' },
    { name: 'مؤسسة النور التجارية', phone: '07702345678', city: 'بغداد', address: 'المنصور، شارع 14 رمضان', tags: ['regular'] as string[], location: [44.3300, 33.3200] as [number, number], uuid: 'CLT-002' },
    { name: 'مصنع دجلة للبلاستيك', phone: '07703456789', city: 'البصرة', address: 'المنطقة الصناعية، الزبير', tags: ['new'] as string[], location: [47.7835, 30.5085] as [number, number], uuid: 'CLT-003' },
    { name: 'شركة بيانات المستقبل', phone: '07704567890', city: 'أربيل', address: 'شارع 60 متري، عينكاوا', tags: ['prospect'] as string[], location: [44.0119, 36.1911] as [number, number], uuid: 'CLT-004' },
    { name: 'مكتبة المعرفة', phone: '07705678901', city: 'بغداد', address: 'الأعظمية، شارع عمر بن عبد العزيز', tags: ['regular'] as string[], location: [44.3500, 33.3600] as [number, number], uuid: 'CLT-005' },
    { name: 'شركة سمارت سوليوشنز', phone: '07706789012', city: 'النجف', address: 'شارع المدينة المنورة', tags: ['vip'] as string[], location: [44.3141, 32.0000] as [number, number], uuid: 'CLT-006' },
    { name: 'مؤسسة الرائد للمقاولات', phone: '07707890123', city: 'السليمانية', address: 'شارع سالم', tags: ['new', 'prospect'] as string[], location: [45.4329, 35.5614] as [number, number], uuid: 'CLT-007' },
    { name: 'متجر الأناقة', phone: '07708901234', city: 'كربلاء', address: 'شارع الحر', tags: ['inactive'] as string[], location: [44.0249, 32.6160] as [number, number], uuid: 'CLT-008' },
  ]

  for (const c of clients) {
    await payload.create({
      collection: 'clients',
      data: { ...c, createdBy: salesId } as any,
      overrideAccess: true,
    })
  }

  // Create visits
  payload.logger.info('— Seed: Creating demo visits...')

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const clientDocs = await payload.find({ collection: 'clients', limit: 4, overrideAccess: true })
  if (clientDocs.docs.length >= 2) {
    await payload.create({
      collection: 'visits',
      data: {
        client: clientDocs.docs[0].id,
        representative: salesId,
        status: 'checked-out',
        checkInTime: twoDaysAgo.toISOString(),
        checkOutTime: new Date(twoDaysAgo.getTime() + 45 * 60000).toISOString(),
        checkInLocation: [44.3661, 33.3152],
        checkOutLocation: [44.3670, 33.3160],
        distance: 35,
        isValid: true,
        notes: 'تمت مناقشة عرض السعر الجديد',
      },
      overrideAccess: true,
    })

    await payload.create({
      collection: 'visits',
      data: {
        client: clientDocs.docs[1].id,
        representative: salesId,
        status: 'checked-out',
        checkInTime: yesterday.toISOString(),
        checkOutTime: new Date(yesterday.getTime() + 30 * 60000).toISOString(),
        checkInLocation: [44.3300, 33.3200],
        checkOutLocation: [44.3310, 33.3205],
        distance: 50,
        isValid: true,
        notes: 'تم توقيع العقد',
      },
      overrideAccess: true,
    })
  }

  // Create design requests
  payload.logger.info('— Seed: Creating demo design requests...')

  await payload.create({
    collection: 'design-requests',
    data: {
      title: 'تصميم بوستر عرض رمضان',
      description: 'نحتاج بوستر جذاب لعرض رمضان على جميع المنصات',
      platform: ['instagram', 'facebook', 'twitter'],
      status: 'in-progress',
      designer: designerId,
      requestedBy: socialId,
      dueDate: '2026-03-01',
    },
    overrideAccess: true,
  })

  await payload.create({
    collection: 'design-requests',
    data: {
      title: 'تصميم شعار المنتج الجديد',
      description: 'شعار عصري بألوان الشركة',
      platform: ['instagram', 'linkedin'],
      status: 'requested',
      requestedBy: socialId,
      dueDate: '2026-03-15',
    },
    overrideAccess: true,
  })

  // Create code reviews
  payload.logger.info('— Seed: Creating demo code reviews...')

  await payload.create({
    collection: 'code-reviews',
    data: {
      title: 'مراجعة API تسجيل الدخول',
      submittedBy: devId,
      reviewer: adminId,
      status: 'approved',
      githubRepo: 'algo-nest/mobile-app',
      githubBranch: 'feat/auth-api',
      githubPR: 'https://github.com/algo-nest/mobile-app/pull/12',
      description: 'تنفيذ نظام المصادقة مع JWT ودعم تعدد الأجهزة',
      reviewNotes: 'كود ممتاز. تمت الموافقة.',
    },
    overrideAccess: true,
  })

  await payload.create({
    collection: 'code-reviews',
    data: {
      title: 'مراجعة شاشة لوحة التحكم',
      submittedBy: devId,
      reviewer: adminId,
      status: 'pending',
      githubRepo: 'algo-nest/mobile-app',
      githubBranch: 'feat/dashboard',
      githubPR: 'https://github.com/algo-nest/mobile-app/pull/18',
      description: 'واجهة لوحة التحكم مع الرسوم البيانية وعرض الإحصائيات',
    },
    overrideAccess: true,
  })

  // Create time entries
  payload.logger.info('— Seed: Creating demo time entries...')

  const taskDocs = await payload.find({
    collection: 'tasks',
    where: { assignee: { equals: devId } },
    limit: 3,
    overrideAccess: true,
  })

  if (taskDocs.docs.length >= 2) {
    const todayStart = new Date()
    todayStart.setHours(9, 0, 0, 0)

    await payload.create({
      collection: 'time-entries',
      data: {
        user: devId,
        task: taskDocs.docs[0].id,
        startTime: new Date(todayStart.getTime() - 86400000).toISOString(),
        endTime: new Date(todayStart.getTime() - 86400000 + 3 * 3600000).toISOString(),
        duration: 180,
        description: 'عمل على واجهة لوحة التحكم',
        isRunning: false,
      },
      overrideAccess: true,
    })

    await payload.create({
      collection: 'time-entries',
      data: {
        user: devId,
        task: taskDocs.docs[1].id,
        startTime: new Date(todayStart.getTime() - 86400000 + 4 * 3600000).toISOString(),
        endTime: new Date(todayStart.getTime() - 86400000 + 5.5 * 3600000).toISOString(),
        duration: 90,
        description: 'مراجعة وتنظيف الكود',
        isRunning: false,
      },
      overrideAccess: true,
    })
  }

  // Create notifications
  payload.logger.info('— Seed: Creating demo notifications...')

  const notifs = [
    { recipient: devId, type: 'task-assigned', title: 'مهمة جديدة', message: 'تم تعيين مهمة "تطوير شاشة لوحة التحكم" لك', link: '/tasks/my', isRead: false },
    { recipient: devId, type: 'task-updated', title: 'تحديث مهمة', message: 'تمت الموافقة على مراجعة كود "API المصادقة"', link: '/code-reviews', isRead: true },
    { recipient: salesId, type: 'task-assigned', title: 'مهمة جديدة', message: 'تم تعيين مهمة "زيارة شركة الفجر للتقنية" لك', link: '/tasks/my', isRead: false },
    { recipient: designerId, type: 'task-assigned', title: 'طلب تصميم', message: 'لديك طلب تصميم جديد "بوستر عرض رمضان"', link: '/designs', isRead: false },
    { recipient: socialId, type: 'task-updated', title: 'تحديث تصميم', message: 'تم بدء العمل على تصميم "بوستر عرض رمضان"', link: '/designs', isRead: false },
    { recipient: adminId, type: 'system', title: 'مرحباً بك', message: 'مرحباً بك في نظام Taskly! هذه بيانات تجريبية.', link: '/', isRead: false },
  ]

  for (const n of notifs) {
    await payload.create({
      collection: 'notifications',
      data: n as any,
      overrideAccess: true,
    })
  }

  payload.logger.info('— Seed: Demo data created successfully! ✓')
  payload.logger.info(`— Seed: All accounts use password: ${DEMO_PASSWORD}`)
}
