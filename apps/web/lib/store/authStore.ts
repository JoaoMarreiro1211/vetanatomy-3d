import { create } from 'zustand'

type AuthState = {
  accessToken: string | null
  setTokens: (access: string | null) => void
  logout: () => void
}

const getInitial = () => {
  if (typeof window === 'undefined') return { accessToken: null }
  return { accessToken: localStorage.getItem('accessToken') }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: getInitial().accessToken,
  setTokens: (access) => {
    if (typeof window !== 'undefined') {
      if (access) {
        localStorage.setItem('accessToken', access)
        document.cookie = 'va_session=1; path=/; max-age=2592000; SameSite=Lax; Secure'
      } else {
        localStorage.removeItem('accessToken')
        document.cookie = 'va_session=; path=/; max-age=0; SameSite=Lax; Secure'
      }
    }
    set({ accessToken: access })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      document.cookie = 'va_session=; path=/; max-age=0; SameSite=Lax; Secure'
    }
    set({ accessToken: null })
  },
}))
