/**
 * Import data from legacy salesDB (MongoDB) into the new Taskly system.
 * 
 * Usage:
 *   npx tsx apps/api/src/import-salesdb.ts
 * 
 * This script connects to the local salesDB, reads the collections,
 * and imports them into Taskly via the Payload CMS API.
 * 
 * Set SALES_DB_URL environment variable to override the default connection string.
 */
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { MongoClient } from 'mongodb'

const SALES_DB_URL = process.env.SALES_DB_URL || 'mongodb://127.0.0.1:27017/salesDB'

async function importSalesDB() {
    console.log('🔄 Starting import from salesDB...')
    console.log(`📡 Connecting to: ${SALES_DB_URL}`)

    const payload = await getPayload({ config: configPromise })
    const mongoClient = new MongoClient(SALES_DB_URL)

    try {
        await mongoClient.connect()
        const salesDB = mongoClient.db()

        // List all collections in salesDB
        const collections = await salesDB.listCollections().toArray()
        console.log(`\n📦 Found ${collections.length} collections in salesDB:`)
        collections.forEach(c => console.log(`   - ${c.name}`))

        // ── Import Users ──
        const usersCollection = salesDB.collection('users')
        const legacyUsers = await usersCollection.find({}).toArray()
        console.log(`\n👥 Importing ${legacyUsers.length} users...`)

        let usersCreated = 0, usersSkipped = 0
        for (const user of legacyUsers) {
            try {
                const existing = await payload.find({
                    collection: 'users',
                    where: { email: { equals: user.email } },
                    limit: 1,
                })
                if (existing.totalDocs > 0) {
                    usersSkipped++
                    continue
                }

                await payload.create({
                    collection: 'users',
                    data: {
                        email: user.email,
                        password: user.password || 'TempPass123!',
                        name: user.name || user.username || user.email.split('@')[0],
                        phone: user.phone || user.mobile || '',
                        role: mapRole(user.role || user.type),
                        isActive: user.isActive !== false && user.active !== false,
                    },
                    overrideAccess: true,
                })
                usersCreated++
            } catch (err: any) {
                console.warn(`   ⚠️ Skipped user ${user.email}: ${err.message}`)
            }
        }
        console.log(`   ✅ Created: ${usersCreated}, Skipped (existing): ${usersSkipped}`)

        // ── Import Clients ──
        const clientsNames = ['clients', 'customers', 'contacts']
        const clientsColName = clientsNames.find(n => collections.some(c => c.name === n))

        if (clientsColName) {
            const clientsCol = salesDB.collection(clientsColName)
            const legacyClients = await clientsCol.find({}).toArray()
            console.log(`\n🏢 Importing ${legacyClients.length} clients from "${clientsColName}"...`)

            let clientsCreated = 0
            for (const client of legacyClients) {
                try {
                    await payload.create({
                        collection: 'clients',
                        data: {
                            name: client.name || client.companyName || client.company || 'عميل بدون اسم',
                            phone: client.phone || client.mobile || '',
                            email: client.email || '',
                            address: client.address || client.location || '',
                            notes: client.notes || client.description || '',
                            lat: client.lat || client.latitude || 0,
                            lng: client.lng || client.longitude || 0,
                        },
                        overrideAccess: true,
                    })
                    clientsCreated++
                } catch (err: any) {
                    console.warn(`   ⚠️ Skipped client: ${err.message}`)
                }
            }
            console.log(`   ✅ Created: ${clientsCreated}`)
        }

        // ── Import Tasks ──
        const tasksNames = ['tasks', 'todos', 'jobs']
        const tasksColName = tasksNames.find(n => collections.some(c => c.name === n))

        if (tasksColName) {
            const tasksCol = salesDB.collection(tasksColName)
            const legacyTasks = await tasksCol.find({}).toArray()
            console.log(`\n📋 Importing ${legacyTasks.length} tasks from "${tasksColName}"...`)

            let tasksCreated = 0
            for (const task of legacyTasks) {
                try {
                    await payload.create({
                        collection: 'tasks',
                        data: {
                            title: task.title || task.name || task.subject || 'مهمة مستوردة',
                            description: task.description || task.details || task.body || '',
                            status: mapStatus(task.status || task.state),
                            priority: mapPriority(task.priority),
                            dueDate: task.dueDate || task.deadline || task.due || null,
                        },
                        overrideAccess: true,
                    })
                    tasksCreated++
                } catch (err: any) {
                    console.warn(`   ⚠️ Skipped task: ${err.message}`)
                }
            }
            console.log(`   ✅ Created: ${tasksCreated}`)
        }

        // ── Import Projects ──
        const projectsNames = ['projects']
        const projectsColName = projectsNames.find(n => collections.some(c => c.name === n))

        if (projectsColName) {
            const projectsCol = salesDB.collection(projectsColName)
            const legacyProjects = await projectsCol.find({}).toArray()
            console.log(`\n📁 Importing ${legacyProjects.length} projects...`)

            let projCreated = 0
            for (const proj of legacyProjects) {
                try {
                    await payload.create({
                        collection: 'projects',
                        data: {
                            name: proj.name || proj.title || 'مشروع مستورد',
                            description: proj.description || '',
                            status: proj.status === 'completed' ? 'completed' : 'active',
                        },
                        overrideAccess: true,
                    })
                    projCreated++
                } catch (err: any) {
                    console.warn(`   ⚠️ Skipped project: ${err.message}`)
                }
            }
            console.log(`   ✅ Created: ${projCreated}`)
        }

        // ── Import Visits ──
        const visitsNames = ['visits', 'checkins', 'check-ins']
        const visitsColName = visitsNames.find(n => collections.some(c => c.name === n))

        if (visitsColName) {
            const visitsCol = salesDB.collection(visitsColName)
            const legacyVisits = await visitsCol.find({}).toArray()
            console.log(`\n📍 Importing ${legacyVisits.length} visits from "${visitsColName}"...`)

            let visitsCreated = 0
            for (const visit of legacyVisits) {
                try {
                    await payload.create({
                        collection: 'visits',
                        data: {
                            checkInTime: visit.checkInTime || visit.checkIn || visit.startTime || visit.createdAt || new Date().toISOString(),
                            checkOutTime: visit.checkOutTime || visit.checkOut || visit.endTime || null,
                            lat: visit.lat || visit.latitude || 0,
                            lng: visit.lng || visit.longitude || 0,
                            notes: visit.notes || visit.description || '',
                        },
                        overrideAccess: true,
                    })
                    visitsCreated++
                } catch (err: any) {
                    console.warn(`   ⚠️ Skipped visit: ${err.message}`)
                }
            }
            console.log(`   ✅ Created: ${visitsCreated}`)
        }

        // ── Summary ──
        console.log('\n' + '='.repeat(50))
        console.log('🎉 Import completed successfully!')
        console.log('='.repeat(50))

    } catch (err) {
        console.error('❌ Import failed:', err)
    } finally {
        await mongoClient.close()
        process.exit(0)
    }
}

// ── Role Mapping ──
function mapRole(role: string | undefined): string {
    if (!role) return 'sales-rep'
    const r = role.toLowerCase()
    if (r.includes('admin') || r.includes('مدير')) return 'super-admin'
    if (r.includes('super') || r.includes('مشرف')) return 'supervisor'
    if (r.includes('audit') || r.includes('مراقب')) return 'auditor'
    if (r.includes('design') || r.includes('مصمم')) return 'designer'
    if (r.includes('dev') || r.includes('program') || r.includes('مبرمج')) return 'programmer'
    if (r.includes('social') || r.includes('سوشيال')) return 'social-media-manager'
    return 'sales-rep'
}

// ── Status Mapping ──
function mapStatus(status: string | undefined): string {
    if (!status) return 'pending'
    const s = status.toLowerCase()
    if (s.includes('done') || s.includes('complete') || s.includes('مكتمل')) return 'completed'
    if (s.includes('progress') || s.includes('جاري') || s.includes('active')) return 'in-progress'
    if (s.includes('review') || s.includes('مراجعة')) return 'review'
    if (s.includes('cancel') || s.includes('ملغ')) return 'cancelled'
    return 'pending'
}

// ── Priority Mapping ──
function mapPriority(priority: string | undefined): string {
    if (!priority) return 'medium'
    const p = priority.toLowerCase()
    if (p.includes('urgent') || p.includes('عاجل') || p.includes('critical')) return 'urgent'
    if (p.includes('high') || p.includes('عالي')) return 'high'
    if (p.includes('low') || p.includes('منخفض')) return 'low'
    return 'medium'
}

importSalesDB()
