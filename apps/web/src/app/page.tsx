'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import Header from '@/components/layout/header'

interface DashboardStats {
  activeGateCount: number | null
  followerCount: number | null
  tagCount: number | null
  scheduledPostCount: number | null
}

interface StatCardProps {
  title: string
  value: number | null
  loading: boolean
  icon: React.ReactNode
  href: string
  accentColor: string
}

function StatCard({ title, value, loading, icon, href, accentColor }: StatCardProps) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">
              {value !== null ? value.toLocaleString('ja-JP') : '-'}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3 group-hover:text-blue-600 transition-colors">
        詳細を見る →
      </p>
    </Link>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    activeGateCount: null,
    followerCount: null,
    tagCount: null,
    scheduledPostCount: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [gatesRes, followersRes, tagsRes, postsRes] = await Promise.allSettled([
          api.engagementGates.list(),
          api.followers.list({ limit: 1 }),
          api.tags.list(),
          api.posts.listScheduled(),
        ])

        setStats({
          activeGateCount:
            gatesRes.status === 'fulfilled' && gatesRes.value.success
              ? gatesRes.value.data.filter((g) => g.isActive).length
              : null,
          followerCount:
            followersRes.status === 'fulfilled' && followersRes.value.success
              ? followersRes.value.data.total
              : null,
          tagCount:
            tagsRes.status === 'fulfilled' && tagsRes.value.success
              ? tagsRes.value.data.length
              : null,
          scheduledPostCount:
            postsRes.status === 'fulfilled' && postsRes.value.success
              ? postsRes.value.data.filter((p) => p.status === 'scheduled').length
              : null,
        })
      } catch {
        setError('データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div>
      <Header title="Dashboard" description="X Harness overview" />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stat cards 2x2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard
          title="Engagement Gates"
          value={stats.activeGateCount}
          loading={loading}
          href="/engagement-gates"
          accentColor="#1D9BF0"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          title="Followers"
          value={stats.followerCount}
          loading={loading}
          href="/followers"
          accentColor="#6366F1"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          title="Tags"
          value={stats.tagCount}
          loading={loading}
          href="/tags"
          accentColor="#8B5CF6"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />
        <StatCard
          title="Scheduled Posts"
          value={stats.scheduledPostCount}
          loading={loading}
          href="/scheduled-posts"
          accentColor="#F59E0B"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick action links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/engagement-gates"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: '#1D9BF0' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">Engagement Gates</p>
              <p className="text-xs text-gray-400">Like/repost → DM automation</p>
            </div>
          </Link>

          <Link
            href="/followers"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-indigo-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">Followers</p>
              <p className="text-xs text-gray-400">Manage followers and tags</p>
            </div>
          </Link>

          <Link
            href="/tags"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-purple-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-purple-700 transition-colors">Tags</p>
              <p className="text-xs text-gray-400">Segment followers with tags</p>
            </div>
          </Link>

          <Link
            href="/scheduled-posts"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-amber-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-amber-700 transition-colors">Scheduled Posts</p>
              <p className="text-xs text-gray-400">Schedule and manage posts</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
