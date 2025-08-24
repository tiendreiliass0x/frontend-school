const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiOptions extends RequestInit {
  token?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options
    
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(userData: any) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getProfile(token: string) {
    return this.request('/api/auth/me', { token })
  }

  async changePassword(token: string, currentPassword: string, newPassword: string) {
    return this.request('/api/auth/change-password', {
      method: 'PUT',
      token,
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  // Schools endpoints
  async getSchools(token: string) {
    return this.request('/api/schools', { token })
  }

  async getCurrentSchool(token: string) {
    return this.request('/api/schools/current', { token })
  }

  async getSchool(token: string, id: string) {
    return this.request(`/api/schools/${id}`, { token })
  }

  async createSchool(token: string, schoolData: any) {
    return this.request('/api/schools', {
      method: 'POST',
      token,
      body: JSON.stringify(schoolData),
    })
  }

  async updateSchool(token: string, id: string, schoolData: any) {
    return this.request(`/api/schools/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(schoolData),
    })
  }

  async deleteSchool(token: string, id: string) {
    return this.request(`/api/schools/${id}`, {
      method: 'DELETE',
      token,
    })
  }

  // Users endpoints
  async getUsers(token: string, params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString()
    const endpoint = query ? `/api/users?${query}` : '/api/users'
    return this.request(endpoint, { token })
  }

  async getUser(token: string, id: string) {
    return this.request(`/api/users/${id}`, { token })
  }

  async createUser(token: string, userData: any) {
    return this.request('/api/users', {
      method: 'POST',
      token,
      body: JSON.stringify(userData),
    })
  }

  async updateUser(token: string, id: string, userData: any) {
    return this.request(`/api/users/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(userData),
    })
  }

  async deactivateUser(token: string, id: string) {
    return this.request(`/api/users/${id}`, {
      method: 'DELETE',
      token,
    })
  }

  async activateUser(token: string, id: string) {
    return this.request(`/api/users/${id}/activate`, {
      method: 'POST',
      token,
    })
  }

  // Classes endpoints
  async getClasses(token: string, params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString()
    const endpoint = query ? `/api/classes?${query}` : '/api/classes'
    return this.request(endpoint, { token })
  }

  async getClass(token: string, id: string) {
    return this.request(`/api/classes/${id}`, { token })
  }

  async createClass(token: string, classData: any) {
    return this.request('/api/classes', {
      method: 'POST',
      token,
      body: JSON.stringify(classData),
    })
  }

  async updateClass(token: string, id: string, classData: any) {
    return this.request(`/api/classes/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(classData),
    })
  }

  async deleteClass(token: string, id: string) {
    return this.request(`/api/classes/${id}`, {
      method: 'DELETE',
      token,
    })
  }

  async enrollStudent(token: string, classId: string, studentId: string) {
    return this.request(`/api/classes/${classId}/enroll`, {
      method: 'POST',
      token,
      body: JSON.stringify({ studentId }),
    })
  }

  async unenrollStudent(token: string, classId: string, studentId: string) {
    return this.request(`/api/classes/${classId}/enroll/${studentId}`, {
      method: 'DELETE',
      token,
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient