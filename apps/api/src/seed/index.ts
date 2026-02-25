import type { Payload } from 'payload'

export async function seedDemoData(payload: Payload) {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || 'Admin'

  if (!adminEmail || !adminPassword) {
    payload.logger.info('— Seed: ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping.')
    return
  }

  // Check if admin user already exists
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    limit: 1,
    overrideAccess: true,
  })

  if (docs.length > 0) {
    // Ensure existing user has super-admin role
    if (docs[0].role !== 'super-admin') {
      await payload.update({
        collection: 'users',
        id: docs[0].id,
        data: { role: 'super-admin', isActive: true },
        overrideAccess: true,
      })
      payload.logger.info(`— Seed: Updated ${adminEmail} role to super-admin`)
    }
    return
  }

  // Create admin user
  await payload.create({
    collection: 'users',
    data: {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'super-admin',
      isActive: true,
    } as any,
    overrideAccess: true,
  })

  payload.logger.info(`— Seed: Created super-admin user: ${adminEmail}`)
}
