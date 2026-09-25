'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, getUserToken, getMySongs, addMySong, removeMySong } from '@/lib/supabase'

interface MusicItem {
  id: number
  title: string
  artist: string
  image: string | null
  vote_count: number
  my_vote: boolean
}

export default function Home() {
  const [mode, setMode] = useState<'upload' | 'preview'>('upload')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [items, setItems] = useState<MusicItem[]>([])
  const [mySongs, setMySongs] = useState<number[]>([])

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'submitting' | 'success'>('idle')

  const [token, setToken] = useState('')

  useEffect(() => {
    setToken(getUserToken())
    setMySongs(getMySongs())
    fetchItems(getUserToken())
  }, [])

  const fetchItems = async (userToken: string) => {
    const { data: songs } = await supabase.from('music').select('*')
    const { data: userVotes } = userToken
      ? await supabase.from('votes').select('music_id').eq('voter_token', userToken)
      : { data: [] }

    const votedIds = new Set((userVotes || []).map((v: any) => v.music_id))
    const merged = (songs || []).map((s: any) => ({
      ...s,
      my_vote: votedIds.has(s.id),
    }))
    merged.sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0))
    setItems(merged)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadState('submitting')

    let imageUrl: string | null = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('covers').upload(filename, imageFile)
      if (!error) {
        const { data } = supabase.storage.from('covers').getPublicUrl(filename)
        imageUrl = data.publicUrl
      }
    }

    const userToken = getUserToken()
    const { data, error } = await supabase
      .from('music')
      .insert({ title, artist, image: imageUrl, uploader_token: userToken })
      .select()

    if (!error && data?.[0]) {
      addMySong(data[0].id)
      setMySongs(getMySongs())
      setUploadState('success')
      setTimeout(() => { setTitle(''); setArtist(''); setImageFile(null) }, 2000)
      setTimeout(() => { setMode('preview'); fetchItems(token) }, 2600)
      setTimeout(() => { setUploadState('idle') }, 3000)
    } else {
      setUploadState('idle')
    }
  }

  const handleVote = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const userToken = getUserToken()
    const { data } = await supabase.rpc('toggle_vote', { p_music_id: id, p_voter_token: userToken })
    const newItems = items.map(item =>
      item.id === id ? { ...item, vote_count: data as number, my_vote: !item.my_vote } : item
    ).sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    setItems(newItems)
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const userToken = getUserToken()
    await supabase.rpc('delete_own_music', { p_music_id: id, p_uploader_token: userToken })
    removeMySong(id)
    setMySongs(getMySongs())
    fetchItems(token)
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div style={{ minHeight: '100vh', padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
          musicsumbit
        </h1>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <motion.button onClick={() => uploadState === 'idle' && setMode('upload')} disabled={uploadState !== 'idle'} whileTap={{ scale: 0.95 }}
          style={{ flex: 1, padding: '14px', fontSize: '14px', fontWeight: 600, border: '2px solid #000', borderRadius: '12px', background: 'transparent', color: '#000', cursor: uploadState !== 'idle' ? 'not-allowed' : 'pointer', opacity: uploadState !== 'idle' ? 0.5 : 1, position: 'relative', zIndex: 1, overflow: 'hidden' }}>
          {mode === 'upload' && <motion.div layoutId="toggle-bg" style={{ position: 'absolute', inset: 0, background: '#000', borderRadius: '10px', zIndex: -1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
          <span style={{ color: mode === 'upload' ? '#fff' : '#000', position: 'relative', zIndex: 1 }}>上传</span>
        </motion.button>
        <motion.button onClick={() => uploadState === 'idle' && setMode('preview')} disabled={uploadState !== 'idle'} whileTap={{ scale: 0.95 }}
          style={{ flex: 1, padding: '14px', fontSize: '14px', fontWeight: 600, border: '2px solid #000', borderRadius: '12px', background: 'transparent', color: '#000', cursor: uploadState !== 'idle' ? 'not-allowed' : 'pointer', opacity: uploadState !== 'idle' ? 0.5 : 1, position: 'relative', zIndex: 1, overflow: 'hidden' }}>
          {mode === 'preview' && <motion.div layoutId="toggle-bg" style={{ position: 'absolute', inset: 0, background: '#000', borderRadius: '10px', zIndex: -1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
          <span style={{ color: mode === 'preview' ? '#fff' : '#000', position: 'relative', zIndex: 1 }}>预览</span>
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'upload' ? (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}
            style={{ border: '2px solid #000', borderRadius: '16px', padding: '24px 20px' }}>
            <form onSubmit={handleUpload} style={{ width: '100%' }}>
              <motion.div
                animate={uploadState === 'success'
                  ? { height: 0, opacity: 0, marginBottom: 0 }
                  : { height: 'auto', opacity: 1, marginBottom: 16 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>歌曲名称</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入歌曲名称" required
                  style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px' }} />
              </motion.div>

              <motion.div
                animate={uploadState === 'success'
                  ? { height: 0, opacity: 0, marginBottom: 0 }
                  : { height: 'auto', opacity: 1, marginBottom: 16 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>歌手</label>
                <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="输入歌手名称" required
                  style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px' }} />
              </motion.div>

              <motion.div
                animate={uploadState === 'success'
                  ? { height: 0, opacity: 0, marginBottom: 0 }
                  : { height: 'auto', opacity: 1, marginBottom: 20 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>截图 (选填)</label>
                <div onClick={() => document.getElementById('file-input')?.click()}
                  style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', background: '#fafafa', color: imageFile ? '#000' : '#999', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#000')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#ddd')}>
                  {imageFile?.name || '点击选择截图'}
                </div>
                <input id="file-input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              </motion.div>

              <motion.button type="submit" disabled={uploadState === 'submitting'}
                animate={{
                  height: uploadState === 'success' ? 180 : 56,
                  borderRadius: uploadState === 'success' ? 20 : 12,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                whileHover={uploadState === 'idle' ? { scale: 1.02 } : undefined}
                whileTap={uploadState === 'idle' ? { scale: 0.98 } : undefined}
                style={{ width: '100%', background: '#000', color: '#fff', border: 'none', fontSize: '15px', fontWeight: 600, cursor: uploadState === 'submitting' ? 'not-allowed' : 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {uploadState === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, duration: 0.35 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <motion.div
                      initial={{ rotate: -180, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.25 }}
                      style={{ fontSize: '40px', lineHeight: 1 }}>✓</motion.div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>上传成功</div>
                  </motion.div>
                ) : uploadState === 'submitting' ? (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', fontSize: '18px' }}>◌</motion.span>
                    上传中...
                  </motion.span>
                ) : '提交投稿'}
              </motion.button>
            </form>
            <div style={{ marginTop: '24px', width: '100%' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', letterSpacing: '0.5px' }}>NOTICE</h3>
              <div style={{ border: '1px solid #000', borderRadius: '12px', padding: '16px', fontSize: '13px', lineHeight: '1.6', color: '#333' }}>
                <ul style={{ margin: '0', paddingLeft: '16px', listStyleType: 'none' }}>
                  <li style={{ marginBottom: '6px' }}><span style={{ marginRight: '8px' }}>→</span>最好是英文歌</li>
                  <li style={{ marginBottom: '6px' }}><span style={{ marginRight: '8px' }}>→</span>不玩梗，不整活</li>
                  <li style={{ marginBottom: '6px' }}><span style={{ marginRight: '8px' }}>→</span>节奏感强</li>
                  <li style={{ marginBottom: '6px' }}><span style={{ marginRight: '8px' }}>→</span>循环播放不会腻</li>
                  <li><span style={{ marginRight: '8px' }}>→</span>避免高低频频率过高/过低、响度过大的音乐</li>
                </ul>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}>
            <div style={{ height: '3px', background: '#000', marginBottom: '4px' }} />
            <div>
              <AnimatePresence>
                {items.map((item) => {
                  const isExpanded = expandedId === item.id
                  const isMine = mySongs.includes(item.id)
                  return (
                    <motion.div key={item.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                      transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 0', cursor: 'pointer' }} onClick={() => toggleExpand(item.id)}>
                        <div onClick={(e) => handleVote(item.id, e)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '12px', cursor: 'pointer', flexShrink: 0, transition: 'transform 0.2s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill={item.my_vote ? '#000' : 'none'} stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s' }}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          {item.vote_count > 0 && <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.vote_count}</span>}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                          <div style={{ fontSize: '13px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.artist}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isMine && (
                            <div onClick={(e) => handleDelete(item.id, e)}
                              style={{ color: '#e74c3c', fontSize: '18px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}>🗑</div>
                          )}
                          <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', fontSize: '12px', color: '#888', flexShrink: 0 }}>▼</div>
                        </div>
                      </div>
                      <div style={{ overflow: 'hidden', maxHeight: isExpanded ? '300px' : '0', transition: 'max-height 0.3s ease-out' }}>
                        <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '12px', marginTop: '4px', marginBottom: '4px', display: 'flex', gap: '16px' }}>
                          <div style={{ width: '90px', height: '140px', background: '#e8e8e8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#999', flexShrink: 0, overflow: 'hidden' }}>
                            {item.image ? <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '无'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h3>
                            <p style={{ fontSize: '13px', color: '#888', marginBottom: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.artist}</p>
                            <button onClick={(e) => handleVote(item.id, e)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', whiteSpace: 'nowrap' }}>
                              <span style={{ color: item.my_vote ? '#FFD700' : '#fff', fontSize: '16px', transition: 'color 0.3s' }}>★</span>
                              {item.my_vote ? `已投票 (${item.vote_count})` : `投票 (${item.vote_count})`}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div style={{ height: '1px', background: '#e0e0e0' }} />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
            <div style={{ height: '3px', background: '#000', marginTop: '4px' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
