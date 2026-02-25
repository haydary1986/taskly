import { defineStore } from 'pinia'

interface Project {
  id: string
  name: string
  description?: string
  status: string
  estimatedHours?: number
  startDate?: string
  endDate?: string
  manager?: { id: string; name: string } | string
  members?: ({ id: string; name: string } | string)[]
  tasks?: { docs: any[]; totalDocs: number }
  createdAt: string
  updatedAt: string
}

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const totalDocs = ref(0)
  const loading = ref(false)

  const api = useApi()

  async function fetchProjects() {
    loading.value = true
    try {
      const res = await api.get('/projects', {
        query: { sort: '-createdAt', limit: 50, depth: 1 },
      })
      projects.value = res.docs
      totalDocs.value = res.totalDocs
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchProject(id: string) {
    const res = await api.get(`/projects/${id}`, {
      query: { depth: 2 },
    })
    return res
  }

  async function createProject(data: Partial<Project>) {
    const res = await api.post('/projects', data)
    projects.value.unshift(res.doc)
    return res.doc
  }

  async function updateProject(id: string, data: Partial<Project>) {
    const res = await api.patch(`/projects/${id}`, data)
    const index = projects.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      projects.value[index] = res.doc
    }
    return res.doc
  }

  async function deleteProject(id: string) {
    await api.del(`/projects/${id}`)
    projects.value = projects.value.filter((p) => p.id !== id)
  }

  return {
    projects,
    totalDocs,
    loading,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
  }
})
