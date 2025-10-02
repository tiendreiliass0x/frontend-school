'use client'

import { useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/lib/api'
import { useCache, useCacheInvalidation } from './useCache'
import { toast } from 'react-hot-toast'
import type { QueryParams } from '@/lib/types'
import { processApiError } from '@/lib/processApiError'
export { CategorizedApiError } from '@/lib/processApiError'

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

  const cacheKey = JSON.stringify({ endpoint, token })

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
  const processedError = error
    ? processApiError(error, { showToast: showErrorToast, notify: toast.error })
    : null

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

// Mutation hooks with toast feedback and cache invalidation
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
      const processedError = processApiError(error as Error, {
        showToast: showErrorToast,
        notify: toast.error
      })
      onError?.(processedError, variables)
      throw processedError
    }
  }, [mutationFn, onSuccess, onError, invalidatePatterns, showSuccessToast, showErrorToast, successMessage, invalidatePattern])

  return mutation
}
