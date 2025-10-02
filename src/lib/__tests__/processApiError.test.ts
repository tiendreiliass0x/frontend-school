import { describe, it, expect, vi } from 'vitest'
import { processApiError } from '@/lib/processApiError'
import { ValidationError, ApiError, NetworkError } from '@/lib/api'

describe('processApiError', () => {
  it('aggregates validation errors into a single notification', () => {
    const notify = vi.fn()
    const error = new ValidationError('Validation failed', {
      email: 'Invalid email address',
      password: 'Too short'
    })

    const categorized = processApiError(error, { notify })

    expect(categorized.category).toBe('validation')
    expect(categorized.message).toContain('Please correct 2 fields')
    expect(notify).toHaveBeenCalledTimes(1)
    const [message] = notify.mock.calls[0]
    expect(message).toContain('email: Invalid email address')
    expect(message).toContain('password: Too short')
  })

  it('maps API errors to semantic categories', () => {
    const notify = vi.fn()
    const error = new ApiError('Conflict', 409)

    const categorized = processApiError(error, { notify })

    expect(categorized.category).toBe('conflict')
    expect(categorized.message).toBe('This resource already exists')
    expect(notify).toHaveBeenCalledWith('This resource already exists')
  })

  it('can suppress notifications when showToast is false', () => {
    const notify = vi.fn()
    const error = new NetworkError('offline')

    const categorized = processApiError(error, { showToast: false, notify })

    expect(categorized.category).toBe('network')
    expect(categorized.message).toBe('Network error. Please check your connection')
    expect(notify).not.toHaveBeenCalled()
  })
})
