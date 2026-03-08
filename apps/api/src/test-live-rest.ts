export const testRest = async () => {
    try {
        const baseUrl = 'https://api-task.algonest.tech'

        // 1. Login to get token
        const loginReq = await fetch(`${baseUrl}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@taskly.local',
                password: 'Taskly123!'
            })
        })
        const loginData = await loginReq.json()
        const token = loginData.exp ? loginData.token : undefined // In Payload 3, token is returned directly
        console.log('Login successful:', !!loginData.token)
        if (!loginData.token) {
            console.error(loginData)
            process.exit(1)
        }

        // 2. Create User
        const res = await fetch(`${baseUrl}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `JWT ${loginData.token}`
            },
            body: JSON.stringify({
                email: 'testlivex' + Date.now() + '@taskly.local',
                password: 'password123',
                name: 'Test Live User',
                role: 'sales-rep',
                isActive: true
            })
        })
        console.log('Status', res.status)
        const json = await res.json()
        console.log("Response:", JSON.stringify(json, null, 2))
    } catch (e: any) {
        console.error("Fetch Error:", e)
    }
}
testRest()
