import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

async function importSqlDB() {
    console.log('🔄 Starting import from salesDB.sql...')

    const sqlFilePath = path.resolve(process.cwd(), '../../salesDB.sql')
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`❌ SQL file not found at: ${sqlFilePath}`)
        process.exit(1)
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8')

    const payload = await getPayload({ config: configPromise })

    const idMap = {
        reps: new Map<string, string>(), // old_id -> new_payload_id
        admins: new Map<string, string>(),
    }

    let usersCreated = 0
    let usersSkipped = 0
    let clientsCreated = 0

    // 1. Parse Admins
    console.log('\n👑 Importing Admins...')
    const adminsRegex = /INSERT INTO `admins` \(`id`, `username`, `password`, `full_name`, `created_at`\) VALUES\s*([\s\S]*?);/g
    const adminsMatch = adminsRegex.exec(sqlContent)

    if (adminsMatch) {
        // Regex to capture values like: (1, 'haydary1986', '...', 'Hayder', '2026...')
        // We split by "),"
        const adminRows = adminsMatch[1].split(/\),\s*\(/)
        for (const row of adminRows) {
            const cleanRow = row.replace(/^\(|\)$/g, '').trim()
            // We parse CSV-like values safely (assuming no complex internal commas inside strings)
            // Actually regex for CSV values:
            const values = cleanRow.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map(v => v.replace(/^'|'$/g, '').trim())

            const [id, username, passwordHash, fullName, createdAt] = values

            if (username) {
                try {
                    const email = `${username}@taskly.local` // Mock email since DB uses usernames
                    const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
                    if (existing.totalDocs > 0) {
                        usersSkipped++
                        idMap.admins.set(id, existing.docs[0].id)
                    } else {
                        const newAdmin = await payload.create({
                            collection: 'users',
                            data: {
                                email: email,
                                password: '12345678', // Default uniform password
                                name: fullName,
                                role: 'super-admin',
                                isActive: true,
                            },
                            overrideAccess: true,
                        })
                        idMap.admins.set(id, newAdmin.id)
                        usersCreated++
                    }
                } catch (err: any) {
                    console.error(`⚠️ Error adding admin ${username}:`, err.message)
                }
            }
        }
    }

    // 2. Parse Representatives
    console.log('\n👥 Importing Representatives...')
    const repsRegex = /INSERT INTO `representatives` \(`id`, `username`, `password`, `full_name`, `phone`, `email`, `is_active`, `weekly_target`, `monthly_target`, `created_at`\) VALUES\s*([\s\S]*?);/g
    const repsMatch = repsRegex.exec(sqlContent)

    if (repsMatch) {
        const repsRows = repsMatch[1].split(/\),\s*\(/)
        for (const row of repsRows) {
            const cleanRow = row.replace(/^\(|\)$/g, '').trim()
            const values = cleanRow.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map(v => v.replace(/^'|'$/g, '').trim())

            const [id, username, passwordHash, fullName, phone, emailField, isActive, weekly_target, monthly_target, createdAt] = values

            let email = emailField || ''
            if (!email || email === '') {
                email = `${username}@taskly.local`
            }

            const phoneNumber = phone === 'NULL' ? '' : phone

            if (username) {
                try {
                    const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
                    if (existing.totalDocs > 0) {
                        usersSkipped++
                        idMap.reps.set(id, existing.docs[0].id)
                    } else {
                        const newRep = await payload.create({
                            collection: 'users',
                            data: {
                                email: email,
                                password: '12345678', // Default uniform password
                                name: fullName,
                                phone: phoneNumber,
                                role: 'sales-rep',
                                isActive: isActive === '1',
                            },
                            overrideAccess: true,
                        })
                        idMap.reps.set(id, newRep.id)
                        usersCreated++
                    }
                } catch (err: any) {
                    console.error(`⚠️ Error adding rep ${username}:`, err.message)
                }
            }
        }
    }

    console.log(`✅ Users Created: ${usersCreated}, Skipped (existing): ${usersSkipped}`)

    // 3. Parse Clients
    console.log('\n🏢 Importing Clients...')
    // The clients table structure from the SQL file:
    // `id`, `rep_id`, `company_name`, `contact_person`, `phone`, `email`, `category_id`, `company_type`, `commercial_reg`, `city`, `address`, `latitude`, `longitude`, `location_address`, `interest_level`, `admin_notes`, `rep_notes`, `created_at`
    const clientsRegex = /INSERT INTO `clients` \([^)]+\) VALUES\s*([\s\S]*?);/g
    let match
    const clientsFullContent = []

    // Might be split into multiple INSERT statements in some exports
    while ((match = clientsRegex.exec(sqlContent)) !== null) {
        clientsFullContent.push(match[1])
    }

    for (const block of clientsFullContent) {
        const clientRows = block.split(/\),\s*\(/)

        for (const row of clientRows) {
            const cleanRow = row.replace(/^\(|\)$/g, '').trim()
            const v = cleanRow.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map(v => v.replace(/^'|'$/g, '').trim())

            if (v.length < 18) continue; // Ensure correct number of fields to avoid errors

            const id = v[0]
            const rep_id = v[1]
            const company_name = v[2]
            const contact_person = v[3]
            const phone = v[4] === 'NULL' ? '' : v[4]
            const email = v[5] === 'NULL' ? '' : v[5]
            // index 9 is city, 10 is address, 11 is lat, 12 is lng, 13 is location_address
            const city = v[9] === 'NULL' ? '' : v[9]
            let address = v[10] === 'NULL' ? '' : v[10]
            const latitude = v[11] === 'NULL' ? null : parseFloat(v[11])
            const longitude = v[12] === 'NULL' ? null : parseFloat(v[12])
            const location_address = v[13] === 'NULL' ? '' : v[13]

            if (location_address && location_address !== '') {
                address = address ? `${address} - ${location_address}` : location_address
            }

            // Convert old rep ID to payload User ID
            const payloadUserId = idMap.reps.get(rep_id) || idMap.admins.get(rep_id)

            try {
                await payload.create({
                    collection: 'clients',
                    data: {
                        name: company_name || contact_person || 'عميل بدون اسم',
                        phone: phone,
                        email: email,
                        city: city,
                        address: address,
                        notes: `شخص الاتصال: ${contact_person === 'NULL' ? 'لا يوجد' : contact_person}`,
                        location: (longitude && latitude && !isNaN(longitude) && !isNaN(latitude)) ? [longitude, latitude] : undefined,
                        tags: ['prospect'],
                        createdBy: payloadUserId,
                    },
                    overrideAccess: true,
                })
                clientsCreated++
            } catch (err: any) {
                console.error(`⚠️ Error adding client ${company_name}:`, err.message)
            }
        }
    }

    console.log(`✅ Clients Created: ${clientsCreated}`)

    console.log('\n' + '='.repeat(50))
    console.log('🎉 Database Import from salesDB.sql completed successfully!')
    console.log('=' + '='.repeat(50))
    console.log('\n⚠️ NOTE: ALL USER PASSWORDS HAVE BEEN RESET TO: 12345678')
    process.exit(0)
}

importSqlDB()
