'use client'

import { useState, useEffect } from 'react'
import { fetchApi } from '@/lib/api'
import Header from '@/components/layout/header'

interface LineConnection {
  id: string
  name: string
  worker_url: string
  api_key?: string
  created_at: string
}

export default function SettingsPage() {
  const [connections, setConnections] = useState<LineConnection[]>([])
  const [loading, setLoading] = useState(true)

  // New connection form
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const res = await fetchApi<{ success: boolean; data: LineConnection[] }>('/api/line-connections')
      if (res.success) setConnections(res.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!name || !url || !apiKey) return
    setSaving(true)
    try {
      await fetchApi('/api/line-connections', {
        method: 'POST',
        body: JSON.stringify({ name, workerUrl: url.replace(/\/$/, ''), apiKey }),
      })
      setName('')
      setUrl('')
      setApiKey('')
      await load()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetchApi(`/api/line-connections/${id}`, { method: 'DELETE' })
    await load()
  }

  const [testResults, setTestResults] = useState<Record<string, string>>({})
  const handleTest = async (conn: LineConnection) => {
    setTestResults(prev => ({ ...prev, [conn.id]: '...' }))
    try {
      // Need to fetch full connection with api_key
      const full = await fetchApi<{ success: boolean; data: LineConnection }>(`/api/line-connections/${conn.id}`)
      if (!full.success || !full.data.api_key) {
        setTestResults(prev => ({ ...prev, [conn.id]: '❌ API Key が取得できません' }))
        return
      }
      const res = await fetch(`${conn.worker_url}/api/friends?limit=1`, {
        headers: { Authorization: `Bearer ${full.data.api_key}` },
      })
      setTestResults(prev => ({
        ...prev,
        [conn.id]: res.ok ? '✅ 接続OK' : `❌ ${res.status}`,
      }))
    } catch (err) {
      setTestResults(prev => ({ ...prev, [conn.id]: `❌ ${err}` }))
    }
  }

  return (
    <div>
      <Header title="設定" description="LINE Harness 接続先の管理" />

      <div className="max-w-2xl space-y-6">
        {/* 登録済み一覧 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">LINE Harness 接続先</h2>

          {loading ? (
            <p className="text-sm text-gray-400">読み込み中...</p>
          ) : connections.length === 0 ? (
            <p className="text-sm text-gray-400">接続先が未登録です</p>
          ) : (
            <div className="space-y-3">
              {connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{conn.name}</p>
                    <p className="text-xs text-gray-400">{conn.worker_url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResults[conn.id] && (
                      <span className="text-xs">{testResults[conn.id]}</span>
                    )}
                    <button
                      onClick={() => handleTest(conn)}
                      className="px-2 py-1 text-xs text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50"
                    >
                      テスト
                    </button>
                    <button
                      onClick={() => handleDelete(conn.id)}
                      className="px-2 py-1 text-xs text-red-500 bg-white border border-red-200 rounded hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 新規追加 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">接続先を追加</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前（例: 本番、テスト環境）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Worker URL（例: https://line-crm-worker.workers.dev）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key（lh_xxxxxxxx）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !name || !url || !apiKey}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? '追加中...' : '追加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
