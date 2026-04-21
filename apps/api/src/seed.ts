import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const seedAdmin = async () => {
    try {
        const payload = await getPayload({ config: configPromise })

        // Check if an admin already exists
        const existingAdmins = await payload.find({
            collection: 'users',
            where: {
                role: { equals: 'super-admin' },
            },
            limit: 1,
        })

        const email = process.env.ADMIN_EMAIL
        const password = process.env.ADMIN_PASSWORD
        const name = process.env.ADMIN_NAME || 'مدير النظام'

        if (!email || !password) {
            console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.')
            process.exit(1)
        }

        if (existingAdmins.totalDocs > 0) {
            console.log(`⚠️ A super-admin already exists. Forcing credential update to ${email}...`)
            await payload.update({
                collection: 'users',
                id: existingAdmins.docs[0].id,
                data: {
                    email,
                    password,
                    name,
                    isActive: true,
                },
            })
            console.log('✅ Successfully updated existing super-admin credentials.')
            process.exit(0)
        }

        console.log(`Creating initial super-admin: ${email}...`)

        await payload.create({
            collection: 'users',
            data: {
                email,
                password,
                name,
                role: 'super-admin',
                isActive: true,
            },
        })

        console.log('✅ Successfully created initial super-admin user.')

        process.exit(0)
    } catch (error) {
        console.error('❌ Failed to seed admin user:', error)
        process.exit(1)
    }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedAdmin()
}
