const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Custom error classes for better error handling
export class ApiError extends Error {
  public status: number
  public code?: string
  public details?: any

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  public errors: Record<string, string>

  constructor(message: string, errors: Record<string, string>) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

interface ApiOptions extends RequestInit {
  token?: string
  skipRetry?: boolean
  timeout?: number
}

interface RequestInterceptor {
  (config: ApiOptions & { url: string }): ApiOptions & { url: string }
}

interface ResponseInterceptor {
  onSuccess?: (response: Response) => Response | Promise<Response>
  onError?: (error: Error) => Error | Promise<Error>
}

class ApiClient {
  private baseUrl: string
  private defaultTimeout: number = 30000
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on client errors (4xx) or validation errors
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          throw error
        }

        if (attempt === maxRetries) {
          throw error
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        await this.delay(delay)
      }
    }

    throw lastError!
  }

  private createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeout)
    return controller.signal
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { 
      token, 
      skipRetry = false, 
      timeout = this.defaultTimeout,
      ...fetchOptions 
    } = options
    
    const url = `${this.baseUrl}${endpoint}`
    
    // Apply request interceptors
    let config = { url, ...options }
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config)
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...fetchOptions.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    // Create timeout signal
    const timeoutSignal = this.createTimeoutSignal(timeout)
    const combinedSignal = fetchOptions.signal 
      ? this.combineSignals([fetchOptions.signal, timeoutSignal])
      : timeoutSignal

    const requestFn = async (): Promise<T> => {
      try {
        const response = await fetch(config.url, {
          ...fetchOptions,
          headers,
          signal: combinedSignal,
        })

        // Apply response interceptors
        let processedResponse = response
        for (const interceptor of this.responseInterceptors) {
          if (interceptor.onSuccess) {
            processedResponse = await interceptor.onSuccess(processedResponse)
          }
        }

        if (!processedResponse.ok) {
          await this.handleErrorResponse(processedResponse)
        }

        // Handle empty responses
        const contentType = processedResponse.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          return {} as T
        }

        return await processedResponse.json()
      } catch (error) {
        // Apply error interceptors
        let processedError = error as Error
        for (const interceptor of this.responseInterceptors) {
          if (interceptor.onError) {
            processedError = await interceptor.onError(processedError)
          }
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new NetworkError('Network error occurred. Please check your connection.')
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new NetworkError('Request timed out. Please try again.')
        }

        throw processedError
      }
    }

    if (skipRetry) {
      return await requestFn()
    } else {
      return await this.retryRequest(requestFn)
    }
  }

  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController()
    
    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort()
      } else {
        signal.addEventListener('abort', () => controller.abort())
      }
    })

    return controller.signal
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {}
    
    try {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json()
      } else {
        errorData = { message: await response.text() }
      }
    } catch {
      errorData = { message: 'Unknown error occurred' }
    }

    // Handle validation errors
    if (response.status === 400 && errorData.details && Array.isArray(errorData.details)) {
      const validationErrors: Record<string, string> = {}
      errorData.details.forEach((detail: any) => {
        if (detail.path && detail.message) {
          validationErrors[detail.path.join('.')] = detail.message
        }
      })
      throw new ValidationError(errorData.error || 'Validation failed', validationErrors)
    }

    const message = errorData.error || errorData.message || `HTTP error! status: ${response.status}`
    throw new ApiError(message, response.status, errorData.code, errorData.details)
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

  // Assignments endpoints
  async getAssignments(token: string, params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString()
    const endpoint = query ? `/api/assignments?${query}` : '/api/assignments'
    return this.request(endpoint, { token })
  }

  async getAssignment(token: string, id: string) {
    return this.request(`/api/assignments/${id}`, { token })
  }

  async createAssignment(token: string, assignmentData: any) {
    return this.request('/api/assignments', {
      method: 'POST',
      token,
      body: JSON.stringify(assignmentData),
    })
  }

  async updateAssignment(token: string, id: string, assignmentData: any) {
    return this.request(`/api/assignments/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(assignmentData),
    })
  }

  async deleteAssignment(token: string, id: string) {
    return this.request(`/api/assignments/${id}`, {
      method: 'DELETE',
      token,
    })
  }

  // Grades endpoints
  async getGrades(token: string, params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString()
    const endpoint = query ? `/api/grades?${query}` : '/api/grades'
    return this.request(endpoint, { token })
  }

  async getGrade(token: string, id: string) {
    return this.request(`/api/grades/${id}`, { token })
  }

  async createGrade(token: string, gradeData: any) {
    return this.request('/api/grades', {
      method: 'POST',
      token,
      body: JSON.stringify(gradeData),
    })
  }

  async updateGrade(token: string, id: string, gradeData: any) {
    return this.request(`/api/grades/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(gradeData),
    })
  }

  async bulkGradeAssignment(token: string, bulkGradeData: any) {
    return this.request('/api/grades/bulk', {
      method: 'POST',
      token,
      body: JSON.stringify(bulkGradeData),
    })
  }

  async deleteGrade(token: string, id: string) {
    return this.request(`/api/grades/${id}`, {
      method: 'DELETE',
      token,
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient