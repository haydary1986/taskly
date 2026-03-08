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

        if (existingAdmins.totalDocs > 0) {
            console.log('✅ A super-admin already exists. Skipping seed.')
            process.exit(0)
        }

        const email = process.env.ADMIN_EMAIL || 'admin@taskly.local'
        const password = process.env.ADMIN_PASSWORD || 'Taskly123!'
        const name = process.env.ADMIN_NAME || 'مدير النظام'

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
        if (!process.env.ADMIN_PASSWORD) {
            console.log(`⚠️  Warning: Used default password "${password}". Please change this immediately upon login!`)
        }

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
