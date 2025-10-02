import { ApiError, NetworkError, ValidationError } from '@/lib/api'

export type ErrorCategory =
  | 'validation'
  | 'auth'
  | 'permission'
  | 'notFound'
  | 'conflict'
  | 'rateLimit'
  | 'server'
  | 'network'
  | 'error'

export type NotifyFn = (message: string) => void

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

interface ProcessOptions {
  showToast?: boolean
  notify?: NotifyFn
}

const defaultNotify: NotifyFn = () => {
  // no-op to keep processApiError side-effect free when no notifier is provided
}

export function processApiError(
  error: Error,
  { showToast = true, notify = defaultNotify }: ProcessOptions = {}
): CategorizedApiError {
  let message = error.message
  let category: ErrorCategory = 'error'

  if (error instanceof ValidationError) {
    const fieldErrors = Object.entries(error.errors)
    const fieldCount = fieldErrors.length
    category = 'validation'
    message = fieldCount > 1
      ? `Please correct ${fieldCount} fields before continuing`
      : fieldCount === 1
        ? `Please correct the highlighted field before continuing`
        : 'Please check your input and try again'

    if (showToast) {
      const detailMessage = fieldErrors
        .map(([field, fieldError]) => `${field}: ${fieldError}`)
        .join('; ')

      notify(detailMessage ? `${message}. ${detailMessage}` : message)
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
      default:
        if (error.status >= 500) {
          message = 'Server error. Please try again later'
          category = 'server'
        }
        break
    }

    if (showToast) {
      notify(message)
    }
  } else if (error instanceof NetworkError) {
    message = 'Network error. Please check your connection'
    category = 'network'

    if (showToast) {
      notify(message)
    }
  } else if (showToast) {
    notify(message)
  }

  return new CategorizedApiError(message, category, error)
}
