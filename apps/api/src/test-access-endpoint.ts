export const testAccessEndpoint = async () => {
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
        const token = loginData.exp ? loginData.token : undefined
        if (!token) return console.error('No token')

        // 2. Fetch /api/access
        const res = await fetch(`${baseUrl}/api/access`, {
            method: 'GET',
            headers: { 'Authorization': `JWT ${token}` }
        })
        const json = await res.json()
        console.log("Users Collection Access:")
        console.log("Create:", json.collections.users.create)
        console.log("Read:", json.collections.users.read)
        console.log("Update:", json.collections.users.update)
        console.log("Delete:", json.collections.users.delete)

        console.log("Users Field Access:")
        console.log("Role (create):", json.collections.users.fields.role.create)
        console.log("Role (update):", json.collections.users.fields.role.update)
        console.log("Role (read):", json.collections.users.fields.role.read)
        console.log("isActive (create):", json.collections.users.fields.isActive.create)

        console.log("Media Access Create:", json.collections.media.create)
    } catch (e: any) {
        console.error(e)
    }
}
testAccessEndpoint()
