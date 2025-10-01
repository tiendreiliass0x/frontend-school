'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, BookOpenIcon, ClockIcon } from '@heroicons/react/24/outline'
import { format, isAfter, parseISO } from 'date-fns'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface Assignment {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  maxPoints: number
  instructions: string | null
  isActive: boolean
  createdAt: string
  className: string
  teacherName: string
  teacherLastName: string
}

interface Grade {
  assignmentId: string
  id: string
  points: number | null
  feedback: string | null
  status: 'draft' | 'published'
  gradedAt: string | null
}

export default function StudentAssignmentsPage() {
  const { user, token } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [grades, setGrades] = useState<Record<string, Grade>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // all, upcoming, overdue, completed
  const [search, setSearch] = useState('')

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAssignments(token!)
      setAssignments(response.assignments || [])
    } catch (error) {
      console.error('Failed to fetch assignments:', error)
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchGrades = useCallback(async () => {
    try {
      const response = await apiClient.getGrades(token!)
      const gradesMap: Record<string, Grade> = {}
      response.grades?.forEach((grade: Grade) => {
        gradesMap[grade.assignmentId] = grade
      })
      setGrades(gradesMap)
    } catch (error) {
      console.error('Failed to fetch grades:', error)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchAssignments()
      if (user?.role === 'student') {
        fetchGrades()
      }
    }
  }, [token, user, fetchAssignments, fetchGrades])

  const getAssignmentStatus = (assignment: Assignment) => {
    const grade = grades[assignment.id]
    
    if (grade?.status === 'published') {
      return { status: 'graded', color: 'bg-green-100 text-green-800', label: 'Graded' }
    }
    
    if (!assignment.dueDate) {
      return { status: 'active', color: 'bg-blue-100 text-blue-800', label: 'Active' }
    }
    
    const dueDate = parseISO(assignment.dueDate)
    const now = new Date()
    
    if (isAfter(now, dueDate)) {
      return { status: 'overdue', color: 'bg-red-100 text-red-800', label: 'Overdue' }
    }
    
    return { status: 'upcoming', color: 'bg-yellow-100 text-yellow-800', label: 'Upcoming' }
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = search === '' || 
      assignment.title.toLowerCase().includes(search.toLowerCase()) ||
      assignment.className.toLowerCase().includes(search.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (filter === 'all') return true
    
    const status = getAssignmentStatus(assignment)
    
    switch (filter) {
      case 'upcoming':
        return status.status === 'upcoming' || status.status === 'active'
      case 'overdue':
        return status.status === 'overdue'
      case 'completed':
        return status.status === 'graded'
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[16rem]">
          <div className="text-lg text-gray-600">Loading assignments...</div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
        <p className="text-gray-600 mt-1">View all your assignments and grades</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search assignments or classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignments Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {assignments.length === 0 ? 'No assignments' : 'No matching assignments'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {assignments.length === 0
              ? 'You don’t have any assignments yet.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((assignment) => {
            const status = getAssignmentStatus(assignment)
            const grade = grades[assignment.id]
            
            return (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight">
                      {assignment.title}
                    </CardTitle>
                    <Badge className={status.color}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{assignment.className}</p>
                  <p className="text-xs text-gray-500">
                    {assignment.teacherName} {assignment.teacherLastName}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignment.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    {assignment.dueDate && (
                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Due: {(() => {
                          try {
                            return format(parseISO(assignment.dueDate), 'MMM d, yyyy h:mm a')
                          } catch {
                            return format(new Date(assignment.dueDate), 'MMM d, yyyy')
                          }
                        })()}
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      Max Points: {assignment.maxPoints}
                    </div>
                  </div>

                  {/* Grade Information for Students */}
                  {user?.role === 'student' && grade?.status === 'published' && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Your Grade:</span>
                        <span className="text-lg font-bold text-gray-900">
                          {grade.points !== null ? `${grade.points}/${assignment.maxPoints}` : 'Not graded'}
                        </span>
                      </div>
                      {grade.points !== null && (
                        <div className="text-xs text-gray-500 mb-2">
                          {Math.round((grade.points / assignment.maxPoints) * 100)}%
                        </div>
                      )}
                      {grade.feedback && (
                        <div>
                          <span className="text-xs font-medium text-gray-700">Feedback:</span>
                          <p className="text-xs text-gray-600 mt-1">{grade.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructions Preview */}
                  {assignment.instructions && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
                        View Instructions
                      </summary>
                      <p className="text-gray-600 mt-2 whitespace-pre-wrap">
                        {assignment.instructions}
                      </p>
                    </details>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      </div>
    </ErrorBoundary>
  )
}