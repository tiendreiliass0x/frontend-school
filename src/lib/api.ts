import type {
  Assignment,
  AuthResponse,
  Class,
  Grade,
  QueryParams,
  School,
  User
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type JsonRecord = Record<string, unknown>

type ErrorDetail = {
  path?: string[]
  message: string
}

type ErrorResponse = {
  error?: string
  message?: string
  code?: string
  details?: unknown
}

const isErrorDetail = (value: unknown): value is ErrorDetail => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const detail = value as { path?: unknown; message?: unknown }
  if (typeof detail.message !== 'string') {
    return false
  }

  if (detail.path === undefined) {
    return true
  }

  return Array.isArray(detail.path) && detail.path.every(segment => typeof segment === 'string')
}

type SchoolsResponse = { schools: School[] }
type UsersResponse = { users: User[] }
type ClassesResponse = { classes: Class[] }
type AssignmentsResponse = { assignments: Assignment[]; grades?: Grade[] }
type AssignmentWithGradesResponse = { assignment: Assignment; grades?: Grade[] }
type GradesResponse = { grades: Grade[] }
type SchoolResponse = { school: School }
type ClassResponse = { class: Class }
type UserResponse = { user: User }
type AssignmentResponse = { assignment: Assignment }
type GradeResponse = { grade: Grade }

const createQueryString = (params?: QueryParams): string => {
  if (!params) {
    return ''
  }

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return
    }

    searchParams.set(key, String(value))
  })

  return searchParams.toString()
}

// Custom error classes for better error handling
export class ApiError extends Error {
  public status: number
  public code?: string
  public details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
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
      'X-Requested-With': 'XMLHttpRequest',
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
    let errorData: ErrorResponse = {}

    try {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const parsed = await response.json()
        if (parsed && typeof parsed === 'object') {
          errorData = parsed as ErrorResponse
        }
      } else {
        errorData = { message: await response.text() }
      }
    } catch {
      errorData = { message: 'Unknown error occurred' }
    }

    if (
      response.status === 400 &&
      Array.isArray(errorData.details)
    ) {
      const validationErrors: Record<string, string> = {}

      errorData.details.forEach(detail => {
        if (isErrorDetail(detail)) {
          const key = detail.path?.join('.') || 'form'
          validationErrors[key] = detail.message
        }
      })

      if (Object.keys(validationErrors).length > 0) {
        throw new ValidationError(errorData.error || 'Validation failed', validationErrors)
      }
    }

    const message = errorData.error || errorData.message || `HTTP error! status: ${response.status}`
    throw new ApiError(message, response.status, errorData.code, errorData.details)
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(userData: JsonRecord): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getProfile(token: string): Promise<User> {
    return this.request<User>('/api/auth/me', { token })
  }

  async changePassword(token: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/change-password', {
      method: 'PUT',
      token,
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  // Schools endpoints
  async getSchools(token: string): Promise<SchoolsResponse> {
    return this.request<SchoolsResponse>('/api/schools', { token })
  }

  async getCurrentSchool(token: string): Promise<School> {
    return this.request<School>('/api/schools/current', { token })
  }

  async getSchool(token: string, id: string): Promise<SchoolResponse> {
    return this.request<SchoolResponse>(`/api/schools/${id}`, { token })
  }

  async createSchool(token: string, schoolData: JsonRecord): Promise<SchoolResponse> {
    return this.request<SchoolResponse>('/api/schools', {
      method: 'POST',
      token,
      body: JSON.stringify(schoolData),
    })
  }

  async updateSchool(token: string, id: string, schoolData: JsonRecord): Promise<SchoolResponse> {
    return this.request<SchoolResponse>(`/api/schools/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(schoolData),
    })
  }

  async deleteSchool(token: string, id: string): Promise<void> {
    return this.request<void>(`/api/schools/${id}`, {
      method: 'DELETE',
      token,
    })
  }

  // Users endpoints
  async getUsers(token: string, params: QueryParams = {}): Promise<UsersResponse> {
    const query = createQueryString(params)
    const endpoint = query ? `/api/users?${query}` : '/api/users'
    return this.request<UsersResponse>(endpoint, { token })
  }

  async getUser(token: string, id: string): Promise<UserResponse> {
    return this.request<UserResponse>(`/api/users/${id}`, { token })
  }

  async createUser(token: string, userData: JsonRecord): Promise<UserResponse> {
    return this.request<UserResponse>('/api/users', {
      method: 'POST',
      token,
      body: JSON.stringify(userData),
    })
  }

  async updateUser(token: string, id: string, userData: JsonRecord): Promise<UserResponse> {
    return this.request<UserResponse>(`/api/users/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(userData),
    })
  }

  async deactivateUser(token: string, id: string): Promise<void> {
    return this.request<void>(`/api/users/${id}`, {
      method: 'DELETE',
      token,
    })
  }

  async activateUser(token: string, id: string): Promise<void> {
    return this.request<void>(`/api/users/${id}/activate`, {
      method: 'POST',
      token,
    })
  }

  // Classes endpoints
  async getClasses(token: string, params: QueryParams = {}): Promise<ClassesResponse> {
    const query = createQueryString(params)
    const endpoint = query ? `/api/classes?${query}` : '/api/classes'
    return this.request<ClassesResponse>(endpoint, { token })
  }

  async getClass(token: string, id: string): Promise<ClassResponse> {
    return this.request<ClassResponse>(`/api/classes/${id}`, { token })
  }

  async createClass(token: string, classData: JsonRecord): Promise<ClassResponse> {
    return this.request<ClassResponse>('/api/classes', {
      method: 'POST',
      token,
      body: JSON.stringify(classData),
    })
  }

  async updateClass(token: string, id: string, classData: JsonRecord): Promise<ClassResponse> {
    return this.request<ClassResponse>(`/api/classes/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(classData),
    })
  }

  async deleteClass(token: string, id: string): Promise<void> {
    return this.request<void>(`/api/classes/${id}`, {
      method: 'DELETE',
      token,
    })
  }

  async enrollStudent(token: string, classId: string, studentId: string): Promise<void> {
    return this.request<void>(`/api/classes/${classId}/enroll`, {
      method: 'POST',
      token,
      body: JSON.stringify({ studentId }),
    })
  }

  async unenrollStudent(token: string, classId: string, studentId: string): Promise<void> {
    return this.request<void>(`/api/classes/${classId}/enroll/${studentId}`, {
      method: 'DELETE',
      token,
    })
  }

  // Assignments endpoints
  async getAssignments(token: string, params: QueryParams = {}): Promise<AssignmentsResponse> {
    const query = createQueryString(params)
    const endpoint = query ? `/api/assignments?${query}` : '/api/assignments'
    return this.request<AssignmentsResponse>(endpoint, { token })
  }

  async getAssignment(token: string, id: string): Promise<AssignmentWithGradesResponse> {
    return this.request<AssignmentWithGradesResponse>(`/api/assignments/${id}`, { token })
  }

  async createAssignment(token: string, assignmentData: JsonRecord): Promise<AssignmentResponse> {
    return this.request<AssignmentResponse>('/api/assignments', {
      method: 'POST',
      token,
      body: JSON.stringify(assignmentData),
    })
  }

  async updateAssignment(token: string, id: string, assignmentData: JsonRecord): Promise<AssignmentResponse> {
    return this.request<AssignmentResponse>(`/api/assignments/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(assignmentData),
    })
  }

  async deleteAssignment(token: string, id: string): Promise<void> {
    return this.request<void>(`/api/assignments/${id}`, {
      method: 'DELETE',
      token,
    })
  }

  // Grades endpoints
  async getGrades(token: string, params: QueryParams = {}): Promise<GradesResponse> {
    const query = createQueryString(params)
    const endpoint = query ? `/api/grades?${query}` : '/api/grades'
    return this.request<GradesResponse>(endpoint, { token })
  }

  async getGrade(token: string, id: string): Promise<GradeResponse> {
    return this.request<GradeResponse>(`/api/grades/${id}`, { token })
  }

  async createGrade(token: string, gradeData: JsonRecord): Promise<GradeResponse> {
    return this.request<GradeResponse>('/api/grades', {
      method: 'POST',
      token,
      body: JSON.stringify(gradeData),
    })
  }

  async updateGrade(token: string, id: string, gradeData: JsonRecord): Promise<GradeResponse> {
    return this.request<GradeResponse>(`/api/grades/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(gradeData),
    })
  }

  async bulkGradeAssignment(token: string, bulkGradeData: JsonRecord): Promise<void> {
    return this.request<void>('/api/grades/bulk', {
      method: 'POST',
      token,
      body: JSON.stringify(bulkGradeData),
    })
  }

  async deleteGrade(token: string, id: string): Promise<void> {
    return this.request<void>(`/api/grades/${id}`, {
      method: 'DELETE',
      token,
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
