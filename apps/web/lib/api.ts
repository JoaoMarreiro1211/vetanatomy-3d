import { useAuthStore } from './store/authStore'

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
export const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

async function request(path: string, opts: RequestInit = {}) {
  const url = `${API_BASE}${path}`
  let access = useAuthStore.getState().accessToken
  const headers: Record<string,string> = { 'Accept': 'application/json' }
  if (opts.headers) Object.assign(headers, opts.headers as Record<string,string>)
  if (access) headers['Authorization'] = `Bearer ${access}`


  let res = await fetch(url, { ...opts, headers, credentials: 'include' })

  // try refresh and retry on 401 using httpOnly cookie refresh flow
  if (res.status === 401) {
    try {
      const refreshed = await api.refresh()
      const newAccess = refreshed.access_token || refreshed.access || null
      useAuthStore.getState().setTokens(newAccess)
      access = newAccess
      if (access) headers['Authorization'] = `Bearer ${access}`
      res = await fetch(url, { ...opts, headers, credentials: 'include' })
    } catch (e) {
      useAuthStore.getState().logout()
      const text = await res.text().catch(() => '')
      throw new Error(`Unauthorized: ${text}`)
    }
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res.text()
}

export const api = {
  login: async (email: string, password: string) => {
    const body = new URLSearchParams()
    body.set('username', email)
    body.set('password', password)
    const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', body: body.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'include' })
    if (!res.ok) throw new Error('Login failed')
    return res.json()
  },
  register: (payload: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  speciesGroups: () => request('/species/groups'),
  species: (group?: string) => request(group ? `/species/?group=${encodeURIComponent(group)}` : '/species/'),
  anatomicalTemplates: (params?: { speciesId?: number; group?: string }) => {
    const search = new URLSearchParams()
    if (params?.speciesId) search.set('species_id', String(params.speciesId))
    if (params?.group) search.set('group', params.group)
    const suffix = search.toString() ? `?${search.toString()}` : ''
    return request(`/species/anatomical-templates${suffix}`)
  },
  patients: (params?: { search?: string; group?: string; speciesId?: number }) => {
    const search = new URLSearchParams()
    if (params?.search) search.set('search', params.search)
    if (params?.group) search.set('group', params.group)
    if (params?.speciesId) search.set('species_id', String(params.speciesId))
    const suffix = search.toString() ? `?${search.toString()}` : ''
    return request(`/patients${suffix}`)
  },
  patient: (patientId: string | number) => request(`/patients/${patientId}`),
  createPatient: (payload: any) => request('/patients/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  annotationsByPatient: (patientId: string | number) => request(`/annotations/by_patient/${patientId}`),
  createAnnotation: (payload: any) => request('/annotations/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  attachmentsByPatient: (patientId: string | number) => request(`/attachments/by_patient/${patientId}`),
  uploadAttachment: (formData: FormData) => request('/attachments/upload', { method: 'POST', body: formData }),
  imagingStudiesByPatient: (patientId: string | number) => request(`/imaging/studies/by_patient/${patientId}`),
  imagingFindingsByPatient: (patientId: string | number) => request(`/imaging/findings/by_patient/${patientId}`),
  createImagingStudy: (payload: any) => request('/imaging/studies', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  createImagingSeries: (payload: any) => request('/imaging/series', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  createImagingFinding: (payload: any) => request('/imaging/findings', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  surgicalPlansByPatient: (patientId: string | number) => request(`/surgical-plans/by_patient/${patientId}`),
  createSurgicalPlan: (payload: any) => request('/surgical-plans/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }),
  refresh: async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Refresh failed: ${text}`)
    }
    return res.json()
  },
  logout: async () => {
    const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Logout failed: ${text}`)
    }
    return res.json()
  },
}

export default request
