import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const testAccess = async () => {
    try {
        const payload = await getPayload({ config: configPromise })
        const admins = await payload.find({
            collection: 'users',
            where: { role: { equals: 'super-admin' } },
            limit: 1,
        })
        const adminUser = admins.docs[0]
        
        await payload.create({
            collection: 'users',
            data: {
                email: 'testb' + Date.now() + '@taskly.local',
                password: 'password123',
                name: 'Test Setup User B',
                role: 'sales-rep',
                isActive: true,
                twoFactorEnabled: false
            },
            overrideAccess: false,
            user: adminUser,
        })
        console.log('✅ Success')
        process.exit(0)
    } catch (e: any) {
        console.error("Payload returned error status:", e.status)
        console.error(JSON.stringify(e, null, 2))
        process.exit(1)
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    testAccess()
}
