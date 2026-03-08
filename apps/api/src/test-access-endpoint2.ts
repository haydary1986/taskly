export const testAccessEndpoint = async () => {
    try {
        const baseUrl = 'https://api-task.algonest.tech'
        const loginReq = await fetch(`${baseUrl}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@taskly.local', password: 'Taskly123!' })
        })
        const loginData = await loginReq.json()
        const token = loginData.exp ? loginData.token : undefined
        if (!token) return console.error('No token')

        const res = await fetch(`${baseUrl}/api/access`, {
            method: 'GET',
            headers: { 'Authorization': `JWT ${token}` }
        })
        const json = await res.json()
        if (json.collections?.users?.fields) {
            console.log("Users Field Keys:", Object.keys(json.collections.users.fields))
            console.log("Role:", json.collections.users.fields.role)
            console.log("IsActive:", json.collections.users.fields.isActive)
        } else {
            console.log("NO FIELD ACCESS FOUND IN JSON.COLLECTIONS.USERS.FIELDS")
        }
    } catch (e: any) {
        console.error(e)
    }
}
testAccessEndpoint()
