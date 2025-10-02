'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/lib/api'
import type { Assignment, Grade } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CalendarIcon, UserIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface BulkGradeData {
  studentId: string
  points: number | null
  feedback: string
  status: 'draft' | 'published'
}

type AssignmentSummary = Assignment & { className?: string }

type GradeWithStudent = Grade & {
  gradeId?: string | null
  studentName: string
  studentLastName: string
}

export default function AssignmentGradesPage() {
  const { assignmentId } = useParams()
  const { user, token } = useAuth()
  const [assignment, setAssignment] = useState<AssignmentSummary | null>(null)
  const [grades, setGrades] = useState<GradeWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bulkGradeData, setBulkGradeData] = useState<Record<string, BulkGradeData>>({})
  const [selectedGrade, setSelectedGrade] = useState<GradeWithStudent | null>(null)
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false)
  const [gradeForm, setGradeForm] = useState({
    points: '',
    feedback: '',
    status: 'draft' as 'draft' | 'published'
  })

  const fetchAssignmentWithGrades = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAssignment(token!, assignmentId as string)
      setAssignment(response.assignment)
      setGrades(response.grades || [])

      // Initialize bulk grade data
      const initialBulkData: Record<string, BulkGradeData> = {}
      response.grades?.forEach((grade: GradeWithStudent) => {
        initialBulkData[grade.studentId] = {
          studentId: grade.studentId,
          points: grade.points,
          feedback: grade.feedback || '',
          status: grade.status
        }
      })
      setBulkGradeData(initialBulkData)
    } catch (error) {
      console.error('Failed to fetch assignment:', error)
      setError('Failed to load assignment and grades')
    } finally {
      setLoading(false)
    }
  }, [token, assignmentId])

  useEffect(() => {
    if (token && assignmentId) {
      fetchAssignmentWithGrades()
    }
  }, [token, assignmentId, fetchAssignmentWithGrades])

  const handleBulkSave = async () => {
    try {
      setSaving(true)
      const gradesArray = Object.values(bulkGradeData).filter(grade => 
        grade.points !== null || grade.feedback.trim() !== ''
      )

      if (gradesArray.length === 0) {
        setError('No grades to save')
        return
      }

      await apiClient.bulkGradeAssignment(token!, {
        assignmentId: assignmentId as string,
        grades: gradesArray
      })

      fetchAssignmentWithGrades()
      setError('')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save grades'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleIndividualGrade = (grade: GradeWithStudent) => {
    setSelectedGrade(grade)
    setGradeForm({
      points: grade.points?.toString() || '',
      feedback: grade.feedback || '',
      status: grade.status
    })
    setIsGradeModalOpen(true)
  }

  const handleSaveIndividualGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGrade) return

    try {
      setSaving(true)
      await apiClient.createGrade(token!, {
        assignmentId: assignmentId as string,
        studentId: selectedGrade.studentId,
        points: gradeForm.points ? parseFloat(gradeForm.points) : null,
        feedback: gradeForm.feedback,
        status: gradeForm.status
      })

      fetchAssignmentWithGrades()
      setIsGradeModalOpen(false)
      setSelectedGrade(null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save grade'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const updateBulkGradeData = (
    studentId: string,
    field: keyof BulkGradeData,
    value: BulkGradeData[keyof BulkGradeData]
  ) => {
    setBulkGradeData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const publishAllGrades = async () => {
    if (!confirm('Are you sure you want to publish all grades? Students will be able to see them.')) return

    try {
      setSaving(true)
      const publishedGrades = Object.values(bulkGradeData).map(grade => ({
        ...grade,
        status: 'published' as const
      }))

      await apiClient.bulkGradeAssignment(token!, {
        assignmentId: assignmentId as string,
        grades: publishedGrades
      })

      fetchAssignmentWithGrades()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to publish grades'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const canGrade = user?.role === 'teacher' || user?.role === 'school_admin' || user?.role === 'super_admin'

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[16rem]">
          <div className="text-lg text-gray-600">Loading assignment...</div>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Assignment not found</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Assignment Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <p className="text-gray-600 mt-1">{assignment.className}</p>
            {assignment.description && (
              <p className="text-gray-700 mt-2">{assignment.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-4">
              <Badge variant="outline">
                Max Points: {assignment.maxPoints}
              </Badge>
              {assignment.dueDate && (
                <div className="flex items-center text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
                </div>
              )}
              <Badge variant={assignment.isActive ? "default" : "secondary"}>
                {assignment.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          {canGrade && (
            <div className="flex space-x-2">
              <Button 
                onClick={handleBulkSave} 
                disabled={saving}
                variant="outline"
              >
                {saving ? 'Saving...' : 'Save All Grades'}
              </Button>
              <Button 
                onClick={publishAllGrades} 
                disabled={saving}
              >
                Publish All Grades
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No students are enrolled in this assignment’s class.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="w-32">Points</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    {canGrade && <TableHead className="w-32">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((grade) => (
                    <TableRow key={grade.studentId}>
                      <TableCell className="font-medium">
                        {grade.studentName} {grade.studentLastName}
                      </TableCell>
                      <TableCell>
                        {canGrade ? (
                          <Input
                            type="number"
                            min="0"
                            max={assignment.maxPoints}
                            value={bulkGradeData[grade.studentId]?.points ?? ''}
                            onChange={(e) => updateBulkGradeData(
                              grade.studentId, 
                              'points', 
                              e.target.value ? parseFloat(e.target.value) : null
                            )}
                            placeholder="0"
                            className="w-20"
                          />
                        ) : (
                          <span className="text-sm">
                            {grade.status === 'published' ? (grade.points ?? 'Not graded') : 'Not published'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canGrade ? (
                          <Textarea
                            value={bulkGradeData[grade.studentId]?.feedback ?? ''}
                            onChange={(e) => updateBulkGradeData(
                              grade.studentId, 
                              'feedback', 
                              e.target.value
                            )}
                            placeholder="Enter feedback..."
                            rows={2}
                            className="min-w-48"
                          />
                        ) : (
                          <span className="text-sm">
                            {grade.status === 'published' ? (grade.feedback || 'No feedback') : 'Not published'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canGrade ? (
                          <Select
                            value={bulkGradeData[grade.studentId]?.status || 'draft'}
                            onValueChange={(value: 'draft' | 'published') => 
                              updateBulkGradeData(grade.studentId, 'status', value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={grade.status === 'published' ? "default" : "secondary"}>
                            {grade.status}
                          </Badge>
                        )}
                      </TableCell>
                      {canGrade && (
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleIndividualGrade(grade)}
                          >
                            Grade
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Grade Modal */}
      <Dialog open={isGradeModalOpen} onOpenChange={setIsGradeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Grade: {selectedGrade?.studentName} {selectedGrade?.studentLastName}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveIndividualGrade} className="space-y-4">
            <div>
              <Label htmlFor="points">Points (Max: {assignment.maxPoints})</Label>
              <Input
                id="points"
                type="number"
                min="0"
                max={assignment.maxPoints}
                value={gradeForm.points}
                onChange={(e) => setGradeForm({ ...gradeForm, points: e.target.value })}
                placeholder="Enter points"
              />
            </div>

            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={gradeForm.feedback}
                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                rows={4}
                placeholder="Enter feedback for the student..."
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={gradeForm.status}
                onValueChange={(value: 'draft' | 'published') => 
                  setGradeForm({ ...gradeForm, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (not visible to student)</SelectItem>
                  <SelectItem value="published">Published (visible to student)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsGradeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Grade'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}