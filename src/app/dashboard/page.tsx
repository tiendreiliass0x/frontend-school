'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'

interface DashboardStats {
  totalUsers: number
  usersByRole: Record<string, number>
}

export default function DashboardPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      if (user?.role === 'super_admin') {
        // Super admin can see all schools stats
        await apiClient.getSchools(token!)
        // For now, just show basic user info
        setStats({ totalUsers: 0, usersByRole: {} })
      } else if (user?.schoolId) {
        // School-specific users get school stats
        await apiClient.getSchool(token!, user.schoolId)
        // For now, just show basic user info
        setStats({ totalUsers: 0, usersByRole: {} })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    if (user && token) {
      fetchStats()
    }
  }, [user, token, fetchStats])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {user?.firstName} {user?.lastName}
        </h1>
        <p className="mt-1 text-sm text-gray-600 capitalize">
          {user?.role.replace('_', ' ')} Dashboard
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">👥</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Students
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.usersByRole?.student || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">🏫</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Teachers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.usersByRole?.teacher || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">📚</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Classes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Assignments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {user?.role === 'super_admin' && (
              <>
                <button 
                  onClick={() => router.push('/dashboard/schools')}
                  className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <span className="text-2xl mr-3">🏫</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Manage Schools</div>
                    <div className="text-sm text-gray-500">Add or edit schools</div>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/dashboard/users')}
                  className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <span className="text-2xl mr-3">👥</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Manage Users</div>
                    <div className="text-sm text-gray-500">Add or edit users</div>
                  </div>
                </button>
              </>
            )}
            
            {(user?.role === 'school_admin' || user?.role === 'super_admin') && (
              <>
                <button 
                  onClick={() => router.push('/dashboard/classes')}
                  className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <span className="text-2xl mr-3">📚</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Manage Classes</div>
                    <div className="text-sm text-gray-500">Create and organize classes</div>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/dashboard/users')}
                  className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <span className="text-2xl mr-3">👥</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Manage Users</div>
                    <div className="text-sm text-gray-500">Add teachers and students</div>
                  </div>
                </button>
              </>
            )}

            {user?.role === 'teacher' && (
              <>
                <button className="flex items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  <span className="text-2xl mr-3">📝</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">My Classes</div>
                    <div className="text-sm text-gray-500">View your teaching schedule</div>
                  </div>
                </button>
                <button className="flex items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <span className="text-2xl mr-3">✏️</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Grade Assignments</div>
                    <div className="text-sm text-gray-500">Review and grade student work</div>
                  </div>
                </button>
              </>
            )}

            {user?.role === 'student' && (
              <>
                <button className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <span className="text-2xl mr-3">📖</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">My Classes</div>
                    <div className="text-sm text-gray-500">View enrolled classes</div>
                  </div>
                </button>
                <button className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <span className="text-2xl mr-3">📊</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">My Grades</div>
                    <div className="text-sm text-gray-500">Check your academic progress</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}