import { defineStore } from 'pinia'

interface Task {
  id: string
  title: string
  description?: any
  type: string
  status: string
  priority: string
  assignee?: { id: string; name: string } | string
  assignedBy?: { id: string; name: string } | string
  project?: { id: string; name: string } | string
  dueDate?: string
  recurrence: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

interface TaskFilters {
  status?: string
  type?: string
  priority?: string
  project?: string
  assignee?: string
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const totalDocs = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const filters = ref<TaskFilters>({})

  const api = useApi()

  async function fetchTasks(options?: { myOnly?: boolean }) {
    loading.value = true
    try {
      const where: Record<string, any> = {}

      if (filters.value.status) where.status = { equals: filters.value.status }
      if (filters.value.type) where.type = { equals: filters.value.type }
      if (filters.value.priority) where.priority = { equals: filters.value.priority }
      if (filters.value.project) where.project = { equals: filters.value.project }
      if (filters.value.assignee) where.assignee = { equals: filters.value.assignee }

      const res = await api.get('/tasks', {
        query: {
          where,
          sort: '-createdAt',
          limit: 20,
          page: page.value,
          depth: 1,
        },
      })

      tasks.value = res.docs
      totalDocs.value = res.totalDocs
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      loading.value = false
    }
  }

  async function createTask(data: Partial<Task>) {
    const res = await api.post('/tasks', data)
    tasks.value.unshift(res.doc)
    return res.doc
  }

  async function updateTask(id: string, data: Partial<Task>) {
    const res = await api.patch(`/tasks/${id}`, data)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      tasks.value[index] = res.doc
    }
    return res.doc
  }

  async function deleteTask(id: string) {
    await api.del(`/tasks/${id}`)
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  function setFilters(newFilters: TaskFilters) {
    filters.value = newFilters
    page.value = 1
  }

  return {
    tasks,
    totalDocs,
    page,
    loading,
    filters,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    setFilters,
  }
})
