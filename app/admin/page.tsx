'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface MusicItem {
  id: number
  title: string
  artist: string
  image: string | null
  vote_count: number
}

export default function AdminPage() {
  const [items, setItems] = useState<MusicItem[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    const { data } = await supabase.from('music').select('*')
    if (data) setItems(data.sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0)))
  }

  const handleUpdate = async (id: number) => {
    setLoading(true)
    await supabase.rpc('admin_update_music', { p_music_id: id, p_title: editTitle, p_artist: editArtist, p_image: items.find(i => i.id === id)?.image || null })
    setEditing(null)
    setLoading(false)
    fetchItems()
  }

  const handleDelete = async (id: number) => {
    setLoading(true)
    await supabase.rpc('admin_delete_music', { p_music_id: id })
    setConfirmDelete(null)
    setLoading(false)
    fetchItems()
  }

  const handleImageReplace = async (id: number, file: File) => {
    const ext = file.name.split('.').pop()
    const filename = `admin-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(filename, file)
    if (!error) {
      const { data } = supabase.storage.from('covers').getPublicUrl(filename)
      await supabase.rpc('admin_update_music', {
        p_music_id: id,
        p_title: items.find(i => i.id === id)?.title || '',
        p_artist: items.find(i => i.id === id)?.artist || '',
        p_image: data.publicUrl
      })
      fetchItems()
    }
  }

  const handleRemoveImage = async (id: number) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    setLoading(true)
    await supabase.rpc('admin_update_music', { p_music_id: id, p_title: item.title, p_artist: item.artist, p_image: null })
    setLoading(false)
    fetchItems()
  }

  return (
    <div style={{ minHeight: '100vh', padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="/musicsumbit/" style={{ fontSize: '14px', color: '#888', textDecoration: 'none' }}>← 返回</a>
        <h1 style={{ fontSize: '20px', fontWeight: 800 }}>管理后台</h1>
        <span style={{ fontSize: '12px', color: '#888' }}>{items.length} 首歌</span>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#eee' }}>
        {items.map(item => (
          <div key={item.id} style={{ background: '#fff', padding: '14px' }}>
            {editing === item.id ? (
              <div>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="标题"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }} />
                <input type="text" value={editArtist} onChange={e => setEditArtist(e.target.value)} placeholder="歌手"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }} />
                {item.image && <div style={{ marginBottom: '6px' }}><img src={item.image} style={{ height: '80px', borderRadius: '6px' }} /></div>}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: '#fafafa' }}>
                    换截图
                    <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleImageReplace(item.id, e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                  {item.image && <button onClick={() => handleRemoveImage(item.id)} style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid #ddd', borderRadius: '6px', background: '#fafafa', cursor: 'pointer' }}>移除截图</button>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleUpdate(item.id)} disabled={loading} style={{ padding: '8px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>保存</button>
                  <button onClick={() => setEditing(null)} style={{ padding: '8px 16px', background: '#eee', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>取消</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#e8e8e8', borderRadius: '6px', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>
                  {item.image ? <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '无'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{item.artist} · ★ {item.vote_count || 0}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                  <button onClick={() => { setEditing(item.id); setEditTitle(item.title); setEditArtist(item.artist) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                  {confirmDelete === item.id ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleDelete(item.id)} disabled={loading} style={{ padding: '4px 8px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>确认</button>
                      <button onClick={() => setConfirmDelete(null)} style={{ padding: '4px 8px', background: '#eee', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>取消</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>暂无数据</div>}
      </div>
    </div>
  )
}
