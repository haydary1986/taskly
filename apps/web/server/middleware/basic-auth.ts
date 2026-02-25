export default defineEventHandler((event) => {
  const auth = getHeader(event, 'authorization')

  const user = process.env.BASIC_AUTH_USER || 'admin'
  const pass = process.env.BASIC_AUTH_PASS || 'Sakina1990'
  const expected = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`

  if (auth !== expected) {
    setResponseHeader(event, 'WWW-Authenticate', 'Basic realm="Taskly"')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
