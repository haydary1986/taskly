import { defineStore } from 'pinia'

interface Company {
  id: string
  name: string
  industry?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  city?: string
  location?: [number, number]
  status: string
  employeeCount?: string
  annualRevenue?: number
  notes?: any
  logo?: any
  createdBy?: any
  createdAt: string
  updatedAt: string
}

export const useCompaniesStore = defineStore('companies', () => {
  const companies = ref<Company[]>([])
  const totalDocs = ref(0)
  const loading = ref(false)

  const api = useApi()

  async function fetchCompanies() {
    loading.value = true
    try {
      const res = await api.get('/companies', {
        query: { sort: '-createdAt', limit: 500, depth: 1 },
      })
      companies.value = res.docs
      totalDocs.value = res.totalDocs
    } catch (err) {
      console.error('Failed to fetch companies:', err)
    } finally {
      loading.value = false
    }
  }

  async function createCompany(data: Partial<Company>) {
    const res = await api.post('/companies', data)
    companies.value.unshift(res.doc)
    return res.doc
  }

  async function updateCompany(id: string, data: Partial<Company>) {
    const res = await api.patch(`/companies/${id}`, data)
    const index = companies.value.findIndex((c) => c.id === id)
    if (index !== -1) companies.value[index] = res.doc
    return res.doc
  }

  async function deleteCompany(id: string) {
    await api.del(`/companies/${id}`)
    companies.value = companies.value.filter((c) => c.id !== id)
  }

  return { companies, totalDocs, loading, fetchCompanies, createCompany, updateCompany, deleteCompany }
})
