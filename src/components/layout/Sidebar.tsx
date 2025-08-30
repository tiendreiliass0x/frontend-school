'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  HomeIcon, 
  UserGroupIcon, 
  AcademicCapIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
  { name: 'Schools', href: '/dashboard/schools', icon: BuildingLibraryIcon, roles: ['super_admin'] },
  { name: 'Users', href: '/dashboard/users', icon: UserGroupIcon, roles: ['super_admin', 'school_admin'] },
  { name: 'Classes', href: '/dashboard/classes', icon: AcademicCapIcon, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
  { name: 'Assignments', href: '/dashboard/assignments', icon: DocumentTextIcon, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
  { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon, roles: ['super_admin', 'school_admin', 'teacher'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon, roles: ['super_admin', 'school_admin'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const filteredNavigation = navigation.filter(item => 
    user && item.roles.includes(user.role)
  )

  return (
    <div className="flex flex-col w-64 bg-gray-800">
      <div className="flex items-center h-16 px-4 bg-gray-900">
        <h1 className="text-white text-lg font-semibold">School Management</h1>
      </div>
      
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center px-4">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-300">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-300">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 capitalize">
              {user?.role.replace('_', ' ')}
            </p>
          </div>
        </div>
        
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300',
                    'mr-3 flex-shrink-0 h-6 w-6'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        <div className="px-2">
          <button
            onClick={logout}
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white w-full"
          >
            <ArrowLeftOnRectangleIcon
              className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300"
              aria-hidden="true"
            />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}