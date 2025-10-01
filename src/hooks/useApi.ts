'use client'

import { useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { ApiError, NetworkError, ValidationError } from '@/lib/api'
import { useCache, useCacheInvalidation } from './useCache'
import { toast } from 'react-hot-toast'
import type { QueryParams } from '@/lib/types'

type ErrorCategory =
  | 'validation'
  | 'auth'
  | 'permission'
  | 'notFound'
  | 'conflict'
  | 'rateLimit'
  | 'server'
  | 'network'
  | 'error'

export class CategorizedApiError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly originalError: Error
  ) {
    super(message)
    this.name = 'CategorizedApiError'
  }
}

export interface UseApiOptions {
  enableCache?: boolean
  cacheTTL?: number
  showErrorToast?: boolean
  showSuccessToast?: boolean
  successMessage?: string
}

// Generic API hook with caching
export function useApi<T>(
  endpoint: string,
  options: UseApiOptions = {}
) {
  const { token } = useAuth()
  const {
    enableCache = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    showErrorToast = true,
    showSuccessToast = false,
    successMessage
  } = options

  const fetcher = useCallback(async (): Promise<T> => {
    if (!token) throw new Error('No authentication token')
    
    const response = await apiClient.request<T>(endpoint, { token })
    
    if (showSuccessToast && successMessage) {
      toast.success(successMessage)
    }
    
    return response
  }, [endpoint, token, showSuccessToast, successMessage])

  const cacheKey = `${endpoint}-${token}`

  const {
    data,
    loading,
    error,
    isStale,
    mutate,
    invalidate,
    refetch
  } = useCache(cacheKey, fetcher, {
    ttl: cacheTTL,
    enabled: enableCache && !!token
  })

  // Enhanced error handling
  const processedError = error ? processApiError(error, showErrorToast) : null

  return {
    data,
    loading,
    error: processedError,
    isStale,
    mutate,
    invalidate,
    refetch
  }
}

// Specialized hooks for common operations
export function useUsers(params?: QueryParams) {
  const { token } = useAuth()
  
  const fetcher = useCallback(async () => {
    if (!token) throw new Error('No authentication token')
    return apiClient.getUsers(token, params)
  }, [token, params])

  return useCache(`users-${JSON.stringify(params)}`, fetcher)
}

export function useClasses(params?: QueryParams) {
  const { token } = useAuth()
  
  const fetcher = useCallback(async () => {
    if (!token) throw new Error('No authentication token')
    return apiClient.getClasses(token, params)
  }, [token, params])

  return useCache(`classes-${JSON.stringify(params)}`, fetcher)
}

export function useAssignments(params?: QueryParams) {
  const { token } = useAuth()
  
  const fetcher = useCallback(async () => {
    if (!token) throw new Error('No authentication token')
    return apiClient.getAssignments(token, params)
  }, [token, params])

  return useCache(`assignments-${JSON.stringify(params)}`, fetcher)
}

export function useGrades(params?: QueryParams) {
  const { token } = useAuth()
  
  const fetcher = useCallback(async () => {
    if (!token) throw new Error('No authentication token')
    return apiClient.getGrades(token, params)
  }, [token, params])

  return useCache(`grades-${JSON.stringify(params)}`, fetcher)
}

// Mutation hooks with optimistic updates
export function useApiMutation<TData, TVariables = Record<string, unknown>>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables) => void
    invalidatePatterns?: string[]
    showSuccessToast?: boolean
    showErrorToast?: boolean
    successMessage?: string
  } = {}
) {
  const {
    onSuccess,
    onError,
    invalidatePatterns = [],
    showSuccessToast = true,
    showErrorToast = true,
    successMessage
  } = options

  const { invalidatePattern } = useCacheInvalidation()

  const mutation = useCallback(async (variables: TVariables) => {
    try {
      const data = await mutationFn(variables)

      // Invalidate cache patterns
      invalidatePatterns.forEach(pattern => invalidatePattern(pattern))

      if (showSuccessToast) {
        toast.success(successMessage || 'Operation completed successfully')
      }

      onSuccess?.(data, variables)
      return data
    } catch (error) {
      const processedError = processApiError(error as Error, showErrorToast)
      onError?.(processedError, variables)
      throw processedError
    }
  }, [mutationFn, onSuccess, onError, invalidatePatterns, showSuccessToast, showErrorToast, successMessage, invalidatePattern])

  return mutation
}

// Process and categorize API errors
function processApiError(error: Error, showToast = true): CategorizedApiError {
  let message = error.message
  let category = 'error'

  if (error instanceof ValidationError) {
    message = 'Please check your input and try again'
    category = 'validation'
    
    if (showToast) {
      // Show specific validation errors
      Object.entries(error.errors).forEach(([field, fieldError]) => {
        toast.error(`${field}: ${fieldError}`)
      })
    }
  } else if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        message = 'Please log in to continue'
        category = 'auth'
        break
      case 403:
        message = 'You do not have permission to perform this action'
        category = 'permission'
        break
      case 404:
        message = 'The requested resource was not found'
        category = 'notFound'
        break
      case 409:
        message = 'This resource already exists'
        category = 'conflict'
        break
      case 429:
        message = 'Too many requests. Please slow down'
        category = 'rateLimit'
        break
      case 500:
        message = 'Server error. Please try again later'
        category = 'server'
        break
    }
    
    if (showToast) {
      toast.error(message)
    }
  } else if (error instanceof NetworkError) {
    message = 'Network error. Please check your connection'
    category = 'network'
    
    if (showToast) {
      toast.error(message)
    }
  } else {
    if (showToast) {
      toast.error(message)
    }
  }

  // Add category to error for better handling
  return new CategorizedApiError(message, category, error)
}
