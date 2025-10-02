export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent'
  schoolId?: string
  phone?: string
  dateOfBirth?: string
  address?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface School {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  website?: string
  principalName?: string
  establishedYear?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AcademicYear {
  id: string
  schoolId: string
  year: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Class {
  id: string
  schoolId: string
  academicYearId: string
  name: string
  subject?: string
  gradeLevel?: number
  teacherId?: string
  room?: string
  capacity?: number
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  teacherName?: string
  teacherLastName?: string
  teacherEmail?: string
}

export interface Enrollment {
  id: string
  studentId: string
  classId: string
  enrollmentDate: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Assignment {
  id: string
  classId: string
  title: string
  description?: string
  dueDate?: string
  maxPoints?: number
  instructions?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  className?: string
  teacherName?: string
  teacherLastName?: string
}

export interface Grade {
  id: string
  studentId: string
  assignmentId: string
  points?: number
  feedback?: string
  status: 'draft' | 'published'
  gradedAt?: string
  gradedBy?: string
  createdAt: string
  updatedAt: string
  studentName?: string
  studentLastName?: string
}

export interface Attendance {
  id: string
  studentId: string
  classId: string
  date: string
  isPresent: boolean
  notes?: string
  recordedBy?: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  token: string
  user: User
  message: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ApiError {
  error: string
}

export type QueryParams = Record<string, string | number | boolean | undefined>
