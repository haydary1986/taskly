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

    const linkRes = await fetch(`${baseUrl}/telegram-link`, {
        headers: { Authorization: `JWT ${token}` }
    })
    const linkData = await linkRes.text()

    console.log('TELEGRAM LINK ENDPOINT:', linkRes.status, linkData)
}
check()
