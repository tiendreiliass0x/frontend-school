'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class Cache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 100

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Clean up expired entries
    this.cleanup()
    
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }
}

const globalCache = new Cache()

export interface UseCacheOptions {
  ttl?: number // Time to live in milliseconds
  enabled?: boolean
  staleWhileRevalidate?: boolean
}

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    enabled = true,
    staleWhileRevalidate = true
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)
  
  const abortControllerRef = useRef<AbortController>()

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = globalCache.get<T>(key)
        if (cached) {
          setData(cached)
          setError(null)
          setIsStale(false)
          return cached
        }
      }

      setLoading(true)
      setError(null)

      const result = await fetcher()

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      // Cache the result
      globalCache.set(key, result, ttl)
      setData(result)
      setIsStale(false)
      
      return result
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        
        // If stale-while-revalidate is enabled, keep showing stale data
        if (staleWhileRevalidate && data) {
          setIsStale(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, ttl, enabled, staleWhileRevalidate, data])

  const mutate = useCallback(async (
    updater?: T | ((current: T | null) => T) | undefined,
    shouldRevalidate = true
  ) => {
    if (updater !== undefined) {
      const newData = typeof updater === 'function' 
        ? (updater as (current: T | null) => T)(data)
        : updater
      
      setData(newData)
      globalCache.set(key, newData, ttl)
    }

    if (shouldRevalidate) {
      return fetchData(true)
    }
  }, [data, key, ttl, fetchData])

  const invalidate = useCallback(() => {
    globalCache.delete(key)
    setData(null)
    setError(null)
    setIsStale(false)
  }, [key])

  useEffect(() => {
    fetchData()
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  return {
    data,
    loading,
    error,
    isStale,
    mutate,
    invalidate,
    refetch: () => fetchData(true)
  }
}

// Hook for invalidating cache patterns
export function useCacheInvalidation() {
  const invalidatePattern = useCallback((pattern: string) => {
    globalCache.invalidatePattern(pattern)
  }, [])

  const clearCache = useCallback(() => {
    globalCache.clear()
  }, [])

  return { invalidatePattern, clearCache }
}