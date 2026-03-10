import { defineStore } from 'pinia'

interface Lead {
  id: string
  name: string
  phone?: string
  email?: string
  companyName?: string
  jobTitle?: string
  source: string
  status: string
  estimatedValue?: number
  assignedTo?: any
  notes?: any
  city?: string
  convertedAt?: string
  convertedTo?: { client?: any; deal?: any; company?: any }
  createdBy?: any
  createdAt: string
  updatedAt: string
}

interface LeadFilters {
  status?: string
  source?: string
  assignedTo?: string
}

export const useLeadsStore = defineStore('leads', () => {
  const leads = ref<Lead[]>([])
  const totalDocs = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const filters = ref<LeadFilters>({})

  const api = useApi()

  async function fetchLeads() {
    loading.value = true
    try {
      const where: Record<string, any> = {}
      if (filters.value.status) where.status = { equals: filters.value.status }
      if (filters.value.source) where.source = { equals: filters.value.source }
      if (filters.value.assignedTo) where.assignedTo = { equals: filters.value.assignedTo }

      const res = await api.get('/leads', {
        query: { where, sort: '-createdAt', limit: 20, page: page.value, depth: 1 },
      })
      leads.value = res.docs
      totalDocs.value = res.totalDocs
    } catch (err) {
      console.error('Failed to fetch leads:', err)
    } finally {
      loading.value = false
    }
  }

  async function createLead(data: Partial<Lead>) {
    const res = await api.post('/leads', data)
    leads.value.unshift(res.doc)
    return res.doc
  }

  async function updateLead(id: string, data: Partial<Lead>) {
    const res = await api.patch(`/leads/${id}`, data)
    const index = leads.value.findIndex((l) => l.id === id)
    if (index !== -1) leads.value[index] = res.doc
    return res.doc
  }

  async function deleteLead(id: string) {
    await api.del(`/leads/${id}`)
    leads.value = leads.value.filter((l) => l.id !== id)
  }

  async function convertLead(leadId: string, options: { createDeal?: boolean; dealTitle?: string; dealValue?: number }) {
    const res = await api.post('/v1/crm/leads/convert', { leadId, ...options })
    const index = leads.value.findIndex((l) => l.id === leadId)
    if (index !== -1) leads.value[index] = { ...leads.value[index], status: 'converted' }
    return res
  }

  function setFilters(newFilters: LeadFilters) {
    filters.value = newFilters
    page.value = 1
  }

  return { leads, totalDocs, page, loading, filters, fetchLeads, createLead, updateLead, deleteLead, convertLead, setFilters }
})
