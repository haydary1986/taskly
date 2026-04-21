/**
 * One-time script to create additional admin users (Mustafa, Rana).
 * Usage: pnpm --filter @taskly/api exec tsx src/create-admins.ts
 */
import { getPayload } from 'payload'
import configPromise from '@payload-config'

interface NewAdmin {
  name: string
  email: string
  password: string
  role: 'super-admin' | 'supervisor'
}

const admins: NewAdmin[] = [
  {
    name: 'مصطفى',
    email: 'mustafa@erticaz.com',
    password: 'ygbaJP9ow6oELeAa1!',
    role: 'super-admin',
  },
  {
    name: 'رنا',
    email: 'rana@erticaz.com',
    password: 'XNVjjIF2mxfZMqAa1!',
    role: 'super-admin',
  },
]

async function run(): Promise<void> {
  const payload = await getPayload({ config: configPromise })

  for (const admin of admins) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: admin.email } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      await payload.update({
        collection: 'users',
        id: existing.docs[0].id,
        data: {
          name: admin.name,
          password: admin.password,
          role: admin.role,
          isActive: true,
        },
        overrideAccess: true,
      })
      console.log(`🔄 Updated: ${admin.name} (${admin.email})`)
    } else {
      await payload.create({
        collection: 'users',
        data: {
          name: admin.name,
          email: admin.email,
          password: admin.password,
          role: admin.role,
          isActive: true,
        } as any,
        overrideAccess: true,
      })
      console.log(`✅ Created: ${admin.name} (${admin.email})`)
    }
  }

  console.log('\n=== CREDENTIALS ===')
  for (const admin of admins) {
    console.log(`\n${admin.name}:`)
    console.log(`  Email:    ${admin.email}`)
    console.log(`  Password: ${admin.password}`)
    console.log(`  Role:     ${admin.role}`)
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
