import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')

export const phoneSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''))

export const dateSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date'),
  z.date(),
  z.null()
]).optional()

// User validation schemas
export const createUserSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  email: emailSchema,
  role: z.enum(['super_admin', 'school_admin', 'teacher', 'student', 'parent'], {
    required_error: 'Please select a role',
    invalid_type_error: 'Please select a valid role'
  }),
  phone: phoneSchema,
  dateOfBirth: dateSchema,
  address: z.string().max(200, 'Address must be less than 200 characters').optional().or(z.literal('')),
  emergencyContact: z.string().max(100, 'Emergency contact must be less than 100 characters').optional().or(z.literal('')),
  emergencyPhone: phoneSchema,
})

export const updateUserSchema = createUserSchema.partial().extend({
  id: z.string().min(1, 'User ID is required')
})

// School validation schemas
export const createSchoolSchema = z.object({
  name: z.string()
    .min(1, 'School name is required')
    .max(100, 'School name must be less than 100 characters'),
  address: z.string()
    .min(1, 'Address is required')
    .max(200, 'Address must be less than 200 characters'),
  phone: phoneSchema.refine(val => val && val.length > 0, {
    message: 'Phone number is required'
  }),
  email: emailSchema,
  website: z.string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
})

export const updateSchoolSchema = createSchoolSchema.partial().extend({
  id: z.string().min(1, 'School ID is required')
})

// Class validation schemas
export const createClassSchema = z.object({
  name: z.string()
    .min(1, 'Class name is required')
    .max(100, 'Class name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  gradeLevel: z.string()
    .min(1, 'Grade level is required')
    .max(20, 'Grade level must be less than 20 characters'),
  teacherId: z.string().min(1, 'Teacher is required'),
  capacity: z.number()
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(200, 'Capacity cannot exceed 200 students'),
  room: z.string()
    .max(50, 'Room must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  schedule: z.string()
    .max(200, 'Schedule must be less than 200 characters')
    .optional()
    .or(z.literal('')),
})

export const updateClassSchema = createClassSchema.partial().extend({
  id: z.string().min(1, 'Class ID is required')
})

// Assignment validation schemas
export const createAssignmentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  instructions: z.string()
    .max(2000, 'Instructions must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  maxPoints: z.number()
    .int('Points must be a whole number')
    .min(1, 'Points must be at least 1')
    .max(1000, 'Points cannot exceed 1000'),
  dueDate: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Please enter a valid date and time'),
    z.date(),
    z.null()
  ]).optional(),
  classId: z.string().min(1, 'Class is required'),
  isActive: z.boolean().default(true),
})

export const updateAssignmentSchema = createAssignmentSchema.partial().extend({
  id: z.string().min(1, 'Assignment ID is required')
})

// Grade validation schemas
export const createGradeSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  assignmentId: z.string().min(1, 'Assignment is required'),
  points: z.number()
    .min(0, 'Points cannot be negative')
    .nullable()
    .optional(),
  feedback: z.string()
    .max(1000, 'Feedback must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  status: z.enum(['draft', 'published']).default('draft'),
})

export const bulkGradeSchema = z.object({
  assignmentId: z.string().min(1, 'Assignment is required'),
  grades: z.array(z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    points: z.number()
      .min(0, 'Points cannot be negative')
      .nullable()
      .optional(),
    feedback: z.string()
      .max(1000, 'Feedback must be less than 1000 characters')
      .optional()
      .or(z.literal('')),
    status: z.enum(['draft', 'published']).default('draft'),
  })).min(1, 'At least one grade is required')
})

// Auth validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Utility function to format validation errors
export const formatValidationErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {}
  error.issues.forEach((issue) => {
    const path = issue.path.join('.')
    errors[path] = issue.message
  })
  return errors
}

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>
export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>
export type CreateGradeInput = z.infer<typeof createGradeSchema>
export type BulkGradeInput = z.infer<typeof bulkGradeSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>