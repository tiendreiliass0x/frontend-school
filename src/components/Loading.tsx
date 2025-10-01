'use client'

import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse'
  text?: string
  className?: string
}

export function Loading({ 
  size = 'md', 
  variant = 'spinner', 
  text,
  className 
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  if (variant === 'spinner') {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="flex flex-col items-center space-y-2">
          <div
            className={cn(
              "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
              sizeClasses[size]
            )}
          />
          {text && (
            <p className={cn("text-gray-600", textSizeClasses[size])}>
              {text}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'dots') {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="flex flex-col items-center space-y-2">
          <div className="flex space-x-1">
            <div className={cn("bg-blue-600 rounded-full animate-pulse", {
              'h-2 w-2': size === 'sm',
              'h-3 w-3': size === 'md',
              'h-4 w-4': size === 'lg',
              'h-5 w-5': size === 'xl'
            })} style={{ animationDelay: '0ms' }} />
            <div className={cn("bg-blue-600 rounded-full animate-pulse", {
              'h-2 w-2': size === 'sm',
              'h-3 w-3': size === 'md',
              'h-4 w-4': size === 'lg',
              'h-5 w-5': size === 'xl'
            })} style={{ animationDelay: '150ms' }} />
            <div className={cn("bg-blue-600 rounded-full animate-pulse", {
              'h-2 w-2': size === 'sm',
              'h-3 w-3': size === 'md',
              'h-4 w-4': size === 'lg',
              'h-5 w-5': size === 'xl'
            })} style={{ animationDelay: '300ms' }} />
          </div>
          {text && (
            <p className={cn("text-gray-600", textSizeClasses[size])}>
              {text}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="flex flex-col items-center space-y-2">
          <div
            className={cn(
              "bg-blue-600 rounded-full animate-pulse",
              sizeClasses[size]
            )}
          />
          {text && (
            <p className={cn("text-gray-600", textSizeClasses[size])}>
              {text}
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}

// Page level loading component
export function PageLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-[16rem] flex items-center justify-center">
      <Loading size="lg" text={text} />
    </div>
  )
}

// Skeleton loading components
export function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-3">
          <div className="flex space-x-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-28"></div>
          </div>
        </div>
        
        {/* Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-gray-200 px-6 py-4">
            <div className="flex space-x-4">
              <div className="h-3 bg-gray-200 rounded w-32"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-28"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Loading overlay for forms
export function LoadingOverlay({ isLoading, children }: { 
  isLoading: boolean
  children: React.ReactNode 
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
          <Loading size="lg" />
        </div>
      )}
    </div>
  )
}