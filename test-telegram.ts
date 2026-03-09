const baseUrl = 'https://api-task.algonest.tech/api'

async function check() {
  const loginRes = await fetch(`${baseUrl}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'haydary1986@gmail.com', password: 'Sakina1990' })
  })

  if (!loginRes.ok) {
    console.error('Login failed', await loginRes.text())
    return
  }

  const { token } = await loginRes.json()

  const settingsRes = await fetch(`${baseUrl}/globals/system-settings`, {
    headers: { Authorization: `JWT ${token}` }
  })
  const settings = await settingsRes.json()

  console.log('TELEGRAM SETTINGS:', {
    telegramEnabled: settings.telegramEnabled,
    telegramBotUsername: settings.telegramBotUsername,
    telegramBotToken: settings.telegramBotToken ? '***' + settings.telegramBotToken.slice(-4) : 'MISSING'
  })
}
check()
