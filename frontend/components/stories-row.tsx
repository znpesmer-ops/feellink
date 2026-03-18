'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { FeellinkRoleBadge } from '@/components/FeellinkRoleBadge'

interface StoryUser {
  id: string
  username: string
  fullName: string | null
  avatar: string | null
  isVerified: boolean
  roles?: string[]
}

export default function StoriesRow() {
  const { accessToken } = useAuthStore()
  const router = useRouter()
  const [highlights, setHighlights] = useState<StoryUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return

    const fetchHighlights = async () => {
      try {
        const response = await api.get('/users/highlights')
        setHighlights(response.data)
      } catch (error) {
        console.error('Failed to fetch highlights:', error)
        // Fallback: empty array
        setHighlights([])
      } finally {
        setLoading(false)
      }
    }

    fetchHighlights()
  }, [accessToken])

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 px-2 scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="min-w-[100px] h-[140px] bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (highlights.length === 0) {
    return null
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 px-2 scrollbar-hide">
      {highlights.map((user) => (
        <div
          key={user.id}
          onClick={() => router.push(`/profile/${user.username}`)}
          className="min-w-[100px] h-[140px] bg-gradient-to-br from-orange-100 to-orange-200 
                     dark:from-orange-950 dark:to-orange-900 rounded-2xl shadow-sm flex flex-col 
                     items-center justify-center cursor-pointer hover:scale-105 transition-transform 
                     duration-200 border-2 border-orange-300 dark:border-orange-800 hover:border-[#ff7b00] 
                     dark:hover:border-[#ff7b00] group"
        >
          <div className="relative mb-2">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.username}
              className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-900 group-hover:border-[#ff7b00] transition-colors"
            />
            <FeellinkRoleBadge roles={user.roles} variant="compact" />
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-200 text-center px-2 truncate w-full">
            {user.username}
          </p>
        </div>
      ))}
    </div>
  )
}

