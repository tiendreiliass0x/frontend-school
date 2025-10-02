'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { User, School, QueryParams } from '@/lib/types'
import apiClient from '@/lib/api'
import { PlusIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function UsersPage() {
  const { user, token } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    role: '',
    search: '',
    schoolId: user?.role === 'super_admin' ? '' : user?.schoolId || '',
  })

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params: QueryParams = {}
      if (filters.role) params.role = filters.role
      if (filters.search) params.search = filters.search
      if (filters.schoolId) params.schoolId = filters.schoolId

      const response = await apiClient.getUsers(token!, params)
      setUsers(response)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  const fetchSchools = useCallback(async () => {
    try {
      const response = await apiClient.getSchools(token!)
      setSchools(response)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to fetch schools:', message)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchUsers()
      if (user?.role === 'super_admin') {
        fetchSchools()
      }
    }
  }, [token, user, fetchUsers, fetchSchools])

  const handleCreateUser = () => {
    setEditingUser(null)
    setShowCreateModal(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setShowCreateModal(true)
  }

  const handleDeactivateUser = async (targetUser: User) => {
    if (!confirm(`Are you sure you want to deactivate "${targetUser.firstName} ${targetUser.lastName}"?`)) return

    try {
      await apiClient.deactivateUser(token!, targetUser.id)
      setUsers(users.map(u => u.id === targetUser.id ? { ...u, isActive: false } : u))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate user'
      alert(`Error deactivating user: ${message}`)
    }
  }

  const handleActivateUser = async (targetUser: User) => {
    try {
      await apiClient.activateUser(token!, targetUser.id)
      setUsers(users.map(u => u.id === targetUser.id ? { ...u, isActive: true } : u))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to activate user'
      alert(`Error activating user: ${message}`)
    }
  }

  const handleModalClose = () => {
    setShowCreateModal(false)
    setEditingUser(null)
  }

  const handleUserSaved = (savedUser: User) => {
    if (editingUser) {
      setUsers(users.map(u => u.id === savedUser.id ? savedUser : u))
    } else {
      setUsers([...users, savedUser])
    }
    handleModalClose()
  }

  const canManageUsers = user?.role === 'super_admin' || user?.role === 'school_admin'

  if (!canManageUsers) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don’t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage {user?.role === 'super_admin' ? 'all' : 'school'} users in the system
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={handleCreateUser}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Search</label>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
          >
            <option value="">All Roles</option>
            <option value="school_admin">School Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
          </select>
        </div>

        {user?.role === 'super_admin' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">School</label>
            <select
              value={filters.schoolId}
              onChange={(e) => setFilters({ ...filters, schoolId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
            >
              <option value="">All Schools</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users.map((targetUser) => (
                      <tr key={targetUser.id}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {targetUser.firstName} {targetUser.lastName}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {targetUser.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {targetUser.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {targetUser.phone || 'Not set'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            targetUser.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {targetUser.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEditUser(targetUser)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          
                          {targetUser.isActive ? (
                            <button
                              onClick={() => handleDeactivateUser(targetUser)}
                              className="text-red-600 hover:text-red-900 mr-4"
                              title="Deactivate"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(targetUser)}
                              className="text-green-600 hover:text-green-900 mr-4"
                              title="Activate"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <UserModal
          user={editingUser}
          schools={schools}
          currentUser={user!}
          onClose={handleModalClose}
          onSave={handleUserSaved}
        />
      )}
    </div>
  )
}

interface UserModalProps {
  user: User | null
  schools: School[]
  currentUser: User
  onClose: () => void
  onSave: (user: User) => void
}

function UserModal({ user: editingUser, schools, currentUser, onClose, onSave }: UserModalProps) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: editingUser?.email || '',
    password: '',
    firstName: editingUser?.firstName || '',
    lastName: editingUser?.lastName || '',
    role: editingUser?.role || 'student',
    schoolId: editingUser?.schoolId || (currentUser.role === 'school_admin' ? currentUser.schoolId : '') || '',
    phone: editingUser?.phone || '',
    address: editingUser?.address || '',
    dateOfBirth: editingUser?.dateOfBirth ? editingUser.dateOfBirth.split('T')[0] : '',
    isActive: editingUser?.isActive ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const userData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
      }

      // Remove password field if empty for updates
      if (editingUser && !userData.password) {
        delete userData.password
      }

      let savedUser
      if (editingUser) {
        const response = await apiClient.updateUser(token!, editingUser.id, userData)
        savedUser = response.user
      } else {
        if (!userData.password) {
          throw new Error('Password is required for new users')
        }
        const response = await apiClient.createUser(token!, userData)
        savedUser = response.user
      }

      onSave(savedUser)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const availableRoles = currentUser.role === 'super_admin' 
    ? ['super_admin', 'school_admin', 'teacher', 'student', 'parent']
    : ['teacher', 'student', 'parent']

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h3>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password {editingUser ? '(leave empty to keep current)' : '*'}
              </label>
              <input
                type="password"
                name="password"
                required={!editingUser}
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                className="mt-1 block w-full rounded-md border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role *</label>
                <select
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900"
                >
                  {availableRoles.map(role => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {(currentUser.role === 'super_admin' || schools.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">School *</label>
                  <select
                    name="schoolId"
                    required
                    value={formData.schoolId}
                    onChange={handleChange}
                    disabled={currentUser.role === 'school_admin'}
                    className="mt-1 block w-full rounded-md border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 disabled:bg-gray-100"
                  >
                    <option value="">Select School</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}