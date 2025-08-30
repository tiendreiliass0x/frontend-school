'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PlusIcon, CalendarIcon, BookOpenIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Assignment {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  maxPoints: number
  instructions: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ClassInfo {
  id: string
  name: string
  description: string | null
  gradeLevel: string | null
  teacherId: string
  schoolId: string
}

export default function ClassAssignmentsPage() {
  const { id: classId } = useParams()
  const router = useRouter()
  const { user, token } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxPoints: 100,
    instructions: '',
    isActive: true
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (token && classId) {
      fetchClassInfo()
      fetchAssignments()
    }
  }, [token, classId])

  const fetchClassInfo = async () => {
    try {
      const response = await apiClient.getClass(token!, classId as string)
      setClassInfo(response.class)
    } catch (error) {
      console.error('Failed to fetch class info:', error)
      setError('Failed to load class information')
    }
  }

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAssignments(token!, { classId: classId as string })
      setAssignments(response.assignments || [])
    } catch (error) {
      console.error('Failed to fetch assignments:', error)
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    if (!formData.title.trim()) {
      setFormErrors({ title: 'Title is required' })
      return
    }

    try {
      const assignmentData = {
        ...formData,
        classId: classId as string,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null
      }

      if (editingAssignment) {
        await apiClient.updateAssignment(token!, editingAssignment.id, assignmentData)
      } else {
        await apiClient.createAssignment(token!, assignmentData)
      }

      fetchAssignments()
      handleCloseModal()
    } catch (error: any) {
      setError(error.message || 'Failed to save assignment')
    }
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return

    try {
      await apiClient.deleteAssignment(token!, assignmentId)
      fetchAssignments()
    } catch (error: any) {
      setError(error.message || 'Failed to delete assignment')
    }
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setEditingAssignment(null)
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      maxPoints: 100,
      instructions: '',
      isActive: true
    })
    setFormErrors({})
  }

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      dueDate: assignment.dueDate ? format(new Date(assignment.dueDate), 'yyyy-MM-dd') : '',
      maxPoints: assignment.maxPoints,
      instructions: assignment.instructions || '',
      isActive: assignment.isActive
    })
    setIsCreateModalOpen(true)
  }

  const canCreateAssignments = user?.role === 'teacher' || user?.role === 'school_admin' || user?.role === 'super_admin'

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-lg text-gray-600">Loading assignments...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {classInfo?.name} - Assignments
          </h1>
          {classInfo?.description && (
            <p className="text-gray-600 mt-1">{classInfo.description}</p>
          )}
          {classInfo?.gradeLevel && (
            <Badge variant="secondary" className="mt-2">
              Grade {classInfo.gradeLevel}
            </Badge>
          )}
        </div>
        {canCreateAssignments && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Assignments Grid */}
      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
          <p className="mt-1 text-sm text-gray-500">
            {canCreateAssignments ? 'Get started by creating your first assignment.' : 'No assignments have been created yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">
                    {assignment.title}
                  </CardTitle>
                  {canCreateAssignments && (
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(assignment)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(assignment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={assignment.isActive ? "default" : "secondary"}>
                    {assignment.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {assignment.maxPoints} pts
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignment.description && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {assignment.description}
                  </p>
                )}
                {assignment.dueDate && (
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Created {format(new Date(assignment.createdAt), 'MMM d, yyyy')}</span>
                  {canCreateAssignments && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/dashboard/classes/${classId}/assignments/${assignment.id}/grades`)}
                    >
                      View Grades
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Assignment Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={formErrors.title ? 'border-red-500' : ''}
              />
              {formErrors.title && (
                <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="maxPoints">Max Points</Label>
                <Input
                  id="maxPoints"
                  type="number"
                  min="0"
                  value={formData.maxPoints}
                  onChange={(e) => setFormData({ ...formData, maxPoints: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={4}
                placeholder="Detailed instructions for students..."
              />
            </div>

            <div>
              <Label htmlFor="isActive">Status</Label>
              <Select
                value={formData.isActive.toString()}
                onValueChange={(value) => setFormData({ ...formData, isActive: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}