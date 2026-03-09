import fs from 'fs'
import path from 'path'
import * as readline from 'readline'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve))
}

async function importToLive() {
    console.log('🌐 أهلاً بك في أداة استيراد البيانات إلى السيرفر الحي (الإنتاج)\n')

    const liveUrl = await question('1. أدخل رابط السيرفر الحي (مثال: https://api-task.algonest.tech): ')
    const baseURL = liveUrl.trim().replace(/\/$/, '')

    const adminEmail = await question('2. أدخل بريد المشرف (Admin Email) للسيرفر الحي: ')
    const adminPassword = await question('3. أدخل كلمة مرور المشرف للسيرفر الحي: ')

    console.log('\n⏳ جاري تسجيل الدخول...')

    try {
        const loginRes = await fetch(`${baseURL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
        })

        if (!loginRes.ok) {
            console.error('❌ فشل تسجيل الدخول. تأكد من صحة البريد الإلكتروني وكلمة المرور.')
            process.exit(1)
        }

        const { token, user: currentUser } = await loginRes.json()
        console.log(`✅ تم تسجيل الدخول بنجاح! مرحباً ${currentUser.name}\n`)

        const sqlFilePath = path.resolve(process.cwd(), '../../salesDB.sql')
        if (!fs.existsSync(sqlFilePath)) {
            console.error(`❌ لم يتم العثور على ملف salesDB.sql في المسار: ${sqlFilePath}`)
            process.exit(1)
        }

        const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8')

        const idMap = {
            reps: new Map<string, string>(),
            admins: new Map<string, string>(),
        }

        let usersCreated = 0
        let usersSkipped = 0
        let clientsCreated = 0

        // Headers for API auth
        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `JWT ${token}`
        }

        // --- IMPORT ADMINS ---
        console.log('👑 جاري استيراد المشرفين...')
        const adminsRegex = /INSERT INTO `admins` \(`id`, `username`, `password`, `full_name`, `created_at`\) VALUES\s*([\s\S]*?);/g
        const adminsMatch = adminsRegex.exec(sqlContent)

        if (adminsMatch) {
            const adminRows = adminsMatch[1].split(/\),\s*\(/)
            for (const row of adminRows) {
                const cleanRow = row.replace(/^\(|\)$/g, '').trim()
                const values = cleanRow.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map(v => v.replace(/^'|'$/g, '').trim())
                const [id, username, , fullName] = values

                if (username) {
                    const email = `${username}@taskly.local`
                    // Check if exists
                    const checkRes = await fetch(`${baseURL}/api/users?where[email][equals]=${encodeURIComponent(email)}`, { headers: authHeaders })
                    const checkData = await checkRes.json()

                    if (checkData.totalDocs > 0) {
                        usersSkipped++
                        idMap.admins.set(id, checkData.docs[0].id)
                    } else {
                        const createRes = await fetch(`${baseURL}/api/users`, {
                            method: 'POST',
                            headers: authHeaders,
                            body: JSON.stringify({
                                email,
                                password: '12345678',
                                name: fullName,
                                role: 'super-admin',
                                isActive: true,
                            })
                        })
                        if (createRes.ok) {
                            const newData = await createRes.json()
                            idMap.admins.set(id, newData.doc.id)
                            usersCreated++
                        } else {
                            console.error(`⚠️ فشل إضافة المشرف ${username}`)
                        }
                    }
                }
            }
        }

        // --- IMPORT REPS ---
        console.log('\n👥 جاري استيراد المندوبين...')
        const repsRegex = /INSERT INTO `representatives` \(`id`, `username`, `password`, `full_name`, `phone`, `email`, `is_active`, `weekly_target`, `monthly_target`, `created_at`\) VALUES\s*([\s\S]*?);/g
        const repsMatch = repsRegex.exec(sqlContent)

        if (repsMatch) {
            const repsRows = repsMatch[1].split(/\),\s*\(/)
            for (const row of repsRows) {
                const cleanRow = row.replace(/^\(|\)$/g, '').trim()
                const values = cleanRow.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map(v => v.replace(/^'|'$/g, '').trim())

                const [id, username, , fullName, phone, emailField, isActive] = values
                let email = emailField || ''
                if (!email || email === '') email = `${username}@taskly.local`
                const phoneNumber = phone === 'NULL' ? '' : phone

                if (username) {
                    const checkRes = await fetch(`${baseURL}/api/users?where[email][equals]=${encodeURIComponent(email)}`, { headers: authHeaders })
                    const checkData = await checkRes.json()

                    if (checkData.totalDocs > 0) {
                        usersSkipped++
                        idMap.reps.set(id, checkData.docs[0].id)
                    } else {
                        const createRes = await fetch(`${baseURL}/api/users`, {
                            method: 'POST',
                            headers: authHeaders,
                            body: JSON.stringify({
                                email,
                                password: '12345678',
                                name: fullName,
                                phone: phoneNumber,
                                role: 'sales-rep',
                                isActive: isActive === '1',
                            })
                        })
                        if (createRes.ok) {
                            const newData = await createRes.json()
                            idMap.reps.set(id, newData.doc.id)
                            usersCreated++
                        } else {
                            console.error(`⚠️ فشل إضافة المندوب ${username}`)
                        }
                    }
                }
            }
        }

        console.log(`✅ المستخدمين (تم إنشاء: ${usersCreated}, تخطي موجود مسبقاً: ${usersSkipped})`)

        // --- IMPORT CLIENTS ---
        console.log('\n🏢 جاري استيراد العملاء...')
        const clientsRegex = /INSERT INTO `clients` \([^)]+\) VALUES\s*([\s\S]*?);/g
        let match
        const clientsFullContent = []

        while ((match = clientsRegex.exec(sqlContent)) !== null) {
            clientsFullContent.push(match[1])
        }

        for (const block of clientsFullContent) {
            const clientRows = block.split(/\),\s*\(/)

            for (const row of clientRows) {
                const cleanRow = row.replace(/^\(|\)$/g, '').trim()
                const v = cleanRow.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map(v => v.replace(/^'|'$/g, '').trim())

                if (v.length < 18) continue

                const id = v[0]
                const rep_id = v[1]
                const company_name = v[2]
                const contact_person = v[3]
                const phone = v[4] === 'NULL' ? '' : v[4]
                const email = v[5] === 'NULL' ? '' : v[5]
                const city = v[9] === 'NULL' ? '' : v[9]
                let address = v[10] === 'NULL' ? '' : v[10]
                const latitude = v[11] === 'NULL' ? null : parseFloat(v[11])
                const longitude = v[12] === 'NULL' ? null : parseFloat(v[12])
                const location_address = v[13] === 'NULL' ? '' : v[13]

                if (location_address && location_address !== '') {
                    address = address ? `${address} - ${location_address}` : location_address
                }

                const payloadUserId = idMap.reps.get(rep_id) || idMap.admins.get(rep_id)

                const createRes = await fetch(`${baseURL}/api/clients`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                        name: company_name || contact_person || 'عميل بدون اسم',
                        phone: phone,
                        email: email,
                        city: city,
                        address: address,
                        notes: `شخص الاتصال: ${contact_person === 'NULL' ? 'لا يوجد' : contact_person}`,
                        location: (longitude && latitude && !isNaN(longitude) && !isNaN(latitude)) ? [longitude, latitude] : undefined,
                        tags: ['prospect'],
                        createdBy: payloadUserId,
                    })
                })

                if (createRes.ok) {
                    clientsCreated++
                } else {
                    console.error(`⚠️ فشل إضافة العميل ${company_name}`)
                }
            }
        }

        console.log(`✅ تم استيراد العملاء ({${clientsCreated}}) بنجاح!`)

        console.log('\n==================================================')
        console.log('🎉 اكتمل ضخ البيانات نحو السيرفر الحي بنجاح!')
        console.log('==================================================')
        console.log('ملاحظة: كلمات السر لكل المستخدمين المستوردين هي 12345678')

    } catch (err: any) {
        console.error('❌ حدث خطأ غير متوقع:', err.message)
    } finally {
        rl.close()
    }
}

importToLive()
