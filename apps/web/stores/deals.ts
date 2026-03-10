import { defineStore } from 'pinia'

interface Deal {
  id: string
  title: string
  company?: any
  contact?: any
  stage: string
  value: number
  currency: string
  probability: number
  assignedTo?: any
  expectedCloseDate?: string
  source?: string
  products?: any[]
  notes?: any
  lostReason?: string
  lead?: any
  closedAt?: string
  createdBy?: any
  createdAt: string
  updatedAt: string
}

interface DealFilters {
  stage?: string
  assignedTo?: string
  source?: string
}

export const useDealsStore = defineStore('deals', () => {
  const deals = ref<Deal[]>([])
  const totalDocs = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const filters = ref<DealFilters>({})

  const api = useApi()

  async function fetchDeals() {
    loading.value = true
    try {
      const where: Record<string, any> = {}
      if (filters.value.stage) where.stage = { equals: filters.value.stage }
      if (filters.value.assignedTo) where.assignedTo = { equals: filters.value.assignedTo }
      if (filters.value.source) where.source = { equals: filters.value.source }

      const res = await api.get('/deals', {
        query: { where, sort: '-createdAt', limit: 20, page: page.value, depth: 1 },
      })
      deals.value = res.docs
      totalDocs.value = res.totalDocs
    } catch (err) {
      console.error('Failed to fetch deals:', err)
    } finally {
      loading.value = false
    }
  }

  async function createDeal(data: Partial<Deal>) {
    const res = await api.post('/deals', data)
    deals.value.unshift(res.doc)
    return res.doc
  }

  async function updateDeal(id: string, data: Partial<Deal>) {
    const res = await api.patch(`/deals/${id}`, data)
    const index = deals.value.findIndex((d) => d.id === id)
    if (index !== -1) deals.value[index] = res.doc
    return res.doc
  }

  async function deleteDeal(id: string) {
    await api.del(`/deals/${id}`)
    deals.value = deals.value.filter((d) => d.id !== id)
  }

  function setFilters(newFilters: DealFilters) {
    filters.value = newFilters
    page.value = 1
  }

  return { deals, totalDocs, page, loading, filters, fetchDeals, createDeal, updateDeal, deleteDeal, setFilters }
})
