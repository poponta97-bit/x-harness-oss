'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { ScheduledPost } from '@/lib/api'
import Header from '@/components/layout/header'

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
    posted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Posted' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  }
  const s = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function formatScheduledAt(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ScheduledPostsPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [formText, setFormText] = useState('')
  const [formScheduledAt, setFormScheduledAt] = useState('')
  const [formAccountId, setFormAccountId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Cancel state
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.posts.listScheduled()
      if (res.success) {
        setPosts(res.data)
      } else {
        setError(res.error ?? 'エラーが発生しました')
      }
    } catch {
      setError('投稿の読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formText.trim() || !formScheduledAt || !formAccountId.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await api.posts.schedule({
        xAccountId: formAccountId.trim(),
        text: formText.trim(),
        scheduledAt: new Date(formScheduledAt).toISOString(),
      })
      if (res.success) {
        setFormText('')
        setFormScheduledAt('')
        setFormAccountId('')
        setShowCreateForm(false)
        loadPosts()
      } else {
        setCreateError(res.error ?? 'エラーが発生しました')
      }
    } catch {
      setCreateError('投稿のスケジュールに失敗しました')
    } finally {
      setCreating(false)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('この投稿をキャンセルしますか？')) return
    setCancellingId(id)
    try {
      await api.posts.cancel(id)
      loadPosts()
    } catch {
      setError('投稿のキャンセルに失敗しました')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div>
      <Header
        title="Scheduled Posts"
        description="スケジュール投稿の管理"
        action={
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {showCreateForm ? 'キャンセル' : '+ Schedule Post'}
          </button>
        }
      />

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">新規スケジュール投稿</h2>
          {createError && (
            <div className="mb-4 bg-red-50 border border-red-200 p-3 text-red-700 text-sm rounded-lg">
              {createError}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                X Account ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formAccountId}
                onChange={(e) => setFormAccountId(e.target.value)}
                placeholder="account_id"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                投稿テキスト <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="ツイートの内容を入力..."
                required
                rows={4}
                maxLength={280}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{formText.length}/280</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                投稿日時 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formScheduledAt}
                onChange={(e) => setFormScheduledAt(e.target.value)}
                required
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={creating || !formText.trim() || !formScheduledAt || !formAccountId.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {creating ? 'スケジュール中...' : 'スケジュール'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 p-4 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Post list */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-gray-100 animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="h-5 bg-gray-100 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400">スケジュール投稿がありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Text
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Scheduled At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                      <p className="truncate">{post.text}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatScheduledAt(post.scheduledAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {post.status === 'scheduled' && (
                        <button
                          onClick={() => handleCancel(post.id)}
                          disabled={cancellingId === post.id}
                          className="text-xs text-red-500 hover:text-red-600 px-3 py-1.5 rounded-md border border-red-100 hover:border-red-200 disabled:opacity-50 transition-colors"
                        >
                          {cancellingId === post.id ? 'キャンセル中...' : 'キャンセル'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
