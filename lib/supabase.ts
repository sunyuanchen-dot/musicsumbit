import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://oszlprlzyxewuomlpwde.supabase.co',
  'sb_publishable_axE2IzqQLEiVY3ajWWlxWw_5k_tYy5T'
)

export function getUserToken(): string {
  if (typeof window === 'undefined') return ''
  let t = localStorage.getItem('user_token')
  if (!t) { t = crypto.randomUUID(); localStorage.setItem('user_token', t) }
  return t
}

export function getMySongs(): number[] {
  try { return JSON.parse(localStorage.getItem('my_songs') || '[]') } catch { return [] }
}

export function addMySong(id: number) {
  const songs = getMySongs()
  if (!songs.includes(id)) { songs.push(id); localStorage.setItem('my_songs', JSON.stringify(songs)) }
}

export function removeMySong(id: number) {
  localStorage.setItem('my_songs', JSON.stringify(getMySongs().filter(s => s !== id)))
}
