'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Class, User, QueryParams } from '@/lib/types'
import apiClient from '@/lib/api'
import { PlusIcon, PencilIcon, TrashIcon, UserGroupIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function ClassesPage() {
  const { user, token } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    teacherId: '',
    gradeLevel: '',
  })

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true)
      const params: QueryParams = {}
      if (filters.search) params.search = filters.search
      if (filters.teacherId) params.teacherId = filters.teacherId
      if (filters.gradeLevel) params.gradeLevel = filters.gradeLevel

      const response = await apiClient.getClasses(token!, params)
      setClasses(response.classes)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to fetch classes')
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  const fetchTeachers = useCallback(async () => {
    try {
      const params: QueryParams = { role: 'teacher' }
      if (user?.role === 'school_admin') {
        params.schoolId = user.schoolId!
      }
      const response = await apiClient.getUsers(token!, params)
      setTeachers(response.users || [])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to fetch teachers:', message)
    }
  }, [token, user])

  useEffect(() => {
    if (token) {
      fetchClasses()
      fetchTeachers()
    }
  }, [token, fetchClasses, fetchTeachers])

  const handleCreateClass = () => {
    setEditingClass(null)
    setShowCreateModal(true)
  }

  const handleEditClass = (classItem: Class) => {
    setEditingClass(classItem)
    setShowCreateModal(true)
  }

  const handleDeleteClass = async (classItem: Class) => {
    if (!confirm(`Are you sure you want to delete "${classItem.name}"?`)) return

    try {
      await apiClient.deleteClass(token!, classItem.id)
      setClasses(classes.filter(c => c.id !== classItem.id))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete class'
      alert(`Error deleting class: ${message}`)
    }
  }

  const handleModalClose = () => {
    setShowCreateModal(false)
    setEditingClass(null)
  }

  const handleClassSaved = (savedClass: Class) => {
    if (editingClass) {
      setClasses(classes.map(c => c.id === savedClass.id ? savedClass : c))
    } else {
      setClasses([...classes, savedClass])
    }
    handleModalClose()
  }

  const canManageClasses = user?.role === 'super_admin' || user?.role === 'school_admin' || user?.role === 'teacher'

  if (!canManageClasses) {
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
          <h1 className="text-2xl font-semibold text-gray-900">Classes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage classes and their enrollments
          </p>
        </div>
        {(user?.role === 'super_admin' || user?.role === 'school_admin') && (
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              onClick={handleCreateClass}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
              Add Class
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Search</label>
          <input
            type="text"
            placeholder="Search by class name or subject..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Teacher</label>
          <select
            value={filters.teacherId}
            onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
          >
            <option value="">All Teachers</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Grade Level</label>
          <select
            value={filters.gradeLevel}
            onChange={(e) => setFilters({ ...filters, gradeLevel: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
          >
            <option value="">All Grades</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </div>
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
        <div className="mt-8">
          {classes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new class.</p>
              {(user?.role === 'super_admin' || user?.role === 'school_admin') && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleCreateClass}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                  >
                    <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                    Add Class
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Link 
                        href={`/dashboard/classes/${classItem.id}`}
                        className="focus:outline-none"
                      >
                        <div className="block">
                          <p className="text-lg font-medium text-gray-900">
                            {classItem.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {classItem.subject}
                          </p>
                        </div>
                      </Link>
                    </div>
                    
                    {(user?.role === 'super_admin' || user?.role === 'school_admin' || 
                      (user?.role === 'teacher' && user?.id === classItem.teacherId)) && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditClass(classItem)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        
                        {(user?.role === 'super_admin' || user?.role === 'school_admin') && (
                          <button
                            onClick={() => handleDeleteClass(classItem)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 mr-1" />
                        {classItem.capacity ? `${classItem.capacity} max` : 'No limit'}
                      </div>
                      {classItem.gradeLevel && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Grade {classItem.gradeLevel}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>Teacher: </span>
                      <span className="ml-1 font-medium">
                        {classItem.teacherName && classItem.teacherLastName 
                          ? `${classItem.teacherName} ${classItem.teacherLastName}`
                          : 'Not assigned'
                        }
                      </span>
                    </div>
                    
                    {classItem.room && (
                      <div className="mt-1 text-sm text-gray-500">
                        Room: {classItem.room}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-between">
                    <Link
                      href={`/dashboard/classes/${classItem.id}/assignments`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      View Assignments
                    </Link>
                    <Link
                      href={`/dashboard/classes/${classItem.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Manage Class →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <ClassModal
          classItem={editingClass}
          teachers={teachers}
          currentUser={user!}
          onClose={handleModalClose}
          onSave={handleClassSaved}
        />
      )}
    </div>
  )
}

interface ClassModalProps {
  classItem: Class | null
  teachers: User[]
  currentUser: User
  onClose: () => void
  onSave: (classItem: Class) => void
}

function ClassModal({ classItem: editingClass, teachers, currentUser, onClose, onSave }: ClassModalProps) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: editingClass?.name || '',
    subject: editingClass?.subject || '',
    gradeLevel: editingClass?.gradeLevel?.toString() || '',
    teacherId: editingClass?.teacherId || '',
    room: editingClass?.room || '',
    capacity: editingClass?.capacity?.toString() || '',
    description: editingClass?.description || '',
    schoolId: editingClass?.schoolId || (currentUser.role === 'school_admin' ? currentUser.schoolId : '') || '',
    academicYearId: editingClass?.academicYearId || '', // You'd need to fetch academic years
    isActive: editingClass?.isActive ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const classData = {
        ...formData,
        gradeLevel: formData.gradeLevel ? parseInt(formData.gradeLevel) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        // For now, use a default academic year ID - you'd want to make this selectable
        academicYearId: formData.academicYearId || '00000000-0000-0000-0000-000000000000',
      }

      let savedClass
      if (editingClass) {
        const response = await apiClient.updateClass(token!, editingClass.id, classData)
        savedClass = response.class
      } else {
        const response = await apiClient.createClass(token!, classData)
        savedClass = response.class
      }

      onSave(savedClass)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to save class')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingClass ? 'Edit Class' : 'Create New Class'}
          </h3>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Class Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Math 101, Grade 5A"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="e.g., Mathematics, Science"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Grade Level</label>
                <select
                  name="gradeLevel"
                  value={formData.gradeLevel}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                >
                  <option value="">Select Grade</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Teacher</label>
                <select
                  name="teacherId"
                  value={formData.teacherId}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Room</label>
                <input
                  type="text"
                  name="room"
                  value={formData.room}
                  onChange={handleChange}
                  placeholder="e.g., Room 101, Lab A"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  placeholder="Maximum students"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief description of the class..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
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
                {loading ? 'Saving...' : editingClass ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}