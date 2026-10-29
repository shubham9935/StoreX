const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const TOKEN_KEY = 'storex.accessToken'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers)
  const token = getAccessToken()

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const body = await response.json()
      if (typeof body.message === 'string') message = body.message
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return null
  return response
}

async function requestJson(path, options) {
  const response = await request(path, options)
  return response.json()
}

export const api = {
  async register({ name, email, password }) {
    return requestJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  },

  async login({ email, password }) {
    return requestJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async currentUser() {
    return requestJson('/auth/me')
  },

  async listFolders(parentFolderId = null) {
    const query = parentFolderId ? `?parentFolderId=${encodeURIComponent(parentFolderId)}` : ''
    return requestJson(`/folders${query}`)
  },

  async createFolder(name, parentFolderId = null) {
    return requestJson('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentFolderId }),
    })
  },

  async renameFolder(id, name) {
    return requestJson(`/folders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
  },

  async deleteFolder(id) {
    await request(`/folders/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  async listFiles(folderId = null) {
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''
    return requestJson(`/files${query}`)
  },

  async recentFiles() {
    return requestJson('/files/recent')
  },

  async search(query) {
    return requestJson(`/search?q=${encodeURIComponent(query)}`)
  },

  async uploadFile(file, folderId = null) {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) formData.append('folderId', folderId)
    return requestJson('/files', { method: 'POST', body: formData })
  },

  async renameFile(id, name) {
    return requestJson(`/files/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
  },

  async deleteFile(id) {
    await request(`/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  async downloadFile(id) {
    const response = await request(`/files/${encodeURIComponent(id)}/download`)
    return response.blob()
  },
}
