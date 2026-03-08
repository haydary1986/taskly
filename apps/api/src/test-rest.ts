import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const testRest = async () => {
    try {
        const payload = await getPayload({ config: configPromise })
        const admins = await payload.find({
            collection: 'users',
            where: { role: { equals: 'super-admin' } },
            limit: 1,
        })
        const adminUser = admins.docs[0]
        
        // Let's generate a Login token
        const loginRes = await payload.login({
            collection: 'users',
            data: {
                email: 'admin@taskly.local',
                password: 'Taskly123!'
            }
        })
        console.log('Login token:', loginRes.token ? 'YES' : 'NO')

        const res = await fetch('http://127.0.0.1:3000/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `JWT ${loginRes.token}`
            },
            body: JSON.stringify({
                email: 'testrest' + Date.now() + '@taskly.local',
                password: 'password123',
                name: 'Test REST User',
                role: 'sales-rep',
                isActive: true
            })
        })
        console.log('Status', res.status)
        const json = await res.json()
        console.log(JSON.stringify(json, null, 2))
        process.exit(0)
    } catch (e: any) {
        console.error(e)
        process.exit(1)
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    testRest()
}
