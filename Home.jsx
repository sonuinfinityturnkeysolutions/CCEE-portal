import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { Avatar, Toast, PostPhotos, PhotoUpload, ThumbGrid } from './UI.jsx'
import { FORUM_CATS, timeAgo, readFileAsDataURL } from '../lib/utils.js'

export default function Home({ onGoOoo, onGoEvents }) {
  const { currentUser } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState('latest')
  const [viewPost, setViewPost] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState({ ooo: 0, refs: 0, events: 0 })

  const isAdmin = currentUser?.role === 'admin'

  function showNotif(msg, type = 'ok') {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadPosts = useCallback(async () => {
    let q = supabase.from('posts').select('*, members(name, company)')
    if (cat !== 'All') q = q.eq('category', cat)
    if (sort === 'latest') q = q.order('created_at', { ascending: false })
    else if (sort === 'active') q = q.order('reply_count', { ascending: false })
    else q = q.order('reply_count', { ascending: true })
    const { data } = await q
    setPosts(data || [])
    setLoading(false)
  }, [cat, sort])

  useEffect(() => { loadPosts() }, [loadPosts])

  useEffect(() => {
    async function loadStats() {
      const [oooRes, evRes] = await Promise.all([
        supabase.from('ooo_meetings').select('id, referral_given').or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`),
        supabase.from('event_rsvps').select('id').eq('member_id', currentUser.id),
      ])
      const oooData = oooRes.data || []
      setStats({
        ooo: oooData.length,
        refs: oooData.filter(o => o.referral_given).length,
        events: (evRes.data || []).length,
      })
    }
    loadStats()
  }, [currentUser.id])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('posts').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadPosts).subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadPosts])

  if (showNew && isAdmin) return <NewPost onBack={() => setShowNew(false)} onSuccess={() => { setShowNew(false); showNotif('Post published!'); loadPosts() }} />
  if (viewPost) return <PostDetail postId={viewPost} onBack={() => { setViewPost(null); loadPosts() }} showNotif={showNotif} />

  const pinned = posts.filter(p => p.pinned)
  const regular = posts.filter(p => !p.pinned)

  return (
    <div className="page">
      <Toast {...(toast || {})} />

      {/* Profile strip */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Avatar name={currentUser.name} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{currentUser.name}</div>
          <div style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 600 }}>{currentUser.company}</div>
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>{currentUser.designation}</div>
        </div>
        {isAdmin && <span className="badge badge-gold" style={{ fontSize: 10 }}>ADMIN</span>}
      </div>

      {/* Stats */}
      <div className="stat-row">
        <div className="stat-box" onClick={onGoOoo}>
          <div className="stat-num">{stats.ooo}</div>
          <div className="stat-lbl">1-to-1s</div>
          <div className="stat-hint">Tap to view →</div>
        </div>
        <div className="stat-box" style={{ background: 'var(--green-light)' }} onClick={onGoOoo}>
          <div className="stat-num" style={{ color: 'var(--green)' }}>{stats.refs}</div>
          <div className="stat-lbl">Referrals Given</div>
          <div className="stat-hint" style={{ color: 'var(--green)' }}>Tap to view →</div>
        </div>
        <div className="stat-box" style={{ background: '#fef3c7' }} onClick={onGoEvents}>
          <div className="stat-num" style={{ color: '#92400e' }}>{stats.events}</div>
          <div className="stat-lbl">Events RSVP'd</div>
          <div className="stat-hint" style={{ color: '#92400e' }}>Tap to view →</div>
        </div>
      </div>

      {/* Forum */}
      <div className="page-hdr" style={{ marginBottom: 10 }}>
        <h1>Forum</h1>
        {isAdmin
          ? <button className="btn btn-sm" onClick={() => setShowNew(true)}>+ Post</button>
          : <span style={{ color: 'var(--dim)', fontSize: 12 }}>Read & reply</span>}
      </div>

      {!isAdmin && (
        <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: 'var(--blue)' }}>
          💬 You can reply to posts and react. Only admins can create new posts.
        </div>
      )}

      <div className="chips">
        {FORUM_CATS.map(c => (
          <button key={c} className={`chip${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="chips">
        {[['latest', 'Latest'], ['active', 'Most Active'], ['unanswered', 'Unanswered']].map(([v, l]) => (
          <button key={v} className={`chip${sort === v ? ' active' : ''}`} onClick={() => setSort(v)}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>Loading…</div> : (
        <>
          {pinned.map(p => <PostCard key={p.id} post={p} onClick={() => setViewPost(p.id)} pinned />)}
          {regular.map(p => <PostCard key={p.id} post={p} onClick={() => setViewPost(p.id)} />)}
          {posts.length === 0 && <div className="empty">No posts yet in this category.</div>}
        </>
      )}
    </div>
  )
}

function PostCard({ post: p, onClick, pinned }) {
  return (
    <div className={`card card-clickable${pinned ? ' post-card-pinned' : ''}`}
      style={{ borderLeft: pinned ? '3px solid var(--blue)' : '3px solid transparent' }}
      onClick={onClick}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar name={p.members?.name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
            {pinned && <span className="badge">📌 Pinned</span>}
            {p.locked && <span className="badge badge-gold">🔒 Locked</span>}
            <span className="badge">{p.category}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3, lineHeight: 1.3 }}>{p.title}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.content}</div>
          <div style={{ display: 'flex', gap: 10, color: 'var(--dim)', fontSize: 12 }}>
            <span>👍 {p.like_count || 0}</span>
            <span>💬 {p.reply_count || 0}</span>
            {p.photos?.length > 0 && <span>📷 {p.photos.length}</span>}
            <span style={{ marginLeft: 'auto' }}>{p.members?.name?.split(' ')[0]} · {timeAgo(p.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PostDetail({ postId, onBack, showNotif }) {
  const { currentUser } = useAuth()
  const [post, setPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from('posts').select('*, members(name, company)').eq('id', postId).single(),
        supabase.from('replies').select('*, members(name, company)').eq('post_id', postId).order('created_at'),
      ])
      setPost(p); setReplies(r || [])
      setLoading(false)
    }
    load()

    const channel = supabase.channel(`post-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies', filter: `post_id=eq.${postId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [postId])

  async function react(type, table, id) {
    await supabase.from('reactions').upsert({ member_id: currentUser.id, target_table: table, target_id: id, reaction_type: type }, { onConflict: 'member_id,target_table,target_id' })
    // Update count
    if (table === 'posts') {
      await supabase.rpc('increment_post_likes', { post_id: id })
      setPost(p => ({ ...p, like_count: (p.like_count || 0) + 1 }))
    }
  }

  async function submitReply() {
    if (!replyText.trim()) return
    if (post.locked) { showNotif('Thread is locked.', 'err'); return }
    const { data } = await supabase.from('replies').insert({ post_id: postId, author_id: currentUser.id, content: replyText }).select('*, members(name, company)').single()
    setReplies(r => [...r, data])
    setReplyText('')
    await supabase.from('posts').update({ reply_count: (post.reply_count || 0) + 1 }).eq('id', postId)
    showNotif('Reply posted!')
  }

  async function togglePin() {
    await supabase.from('posts').update({ pinned: !post.pinned }).eq('id', postId)
    setPost(p => ({ ...p, pinned: !p.pinned }))
    showNotif('Updated.')
  }

  async function toggleLock() {
    await supabase.from('posts').update({ locked: !post.locked }).eq('id', postId)
    setPost(p => ({ ...p, locked: !p.locked }))
    showNotif('Updated.')
  }

  async function deletePost() {
    if (!confirm('Delete this post and all replies?')) return
    await supabase.from('posts').delete().eq('id', postId)
    showNotif('Post deleted.')
    onBack()
  }

  if (loading) return <div className="page"><button className="back-btn" onClick={onBack}>← Back</button><div style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>Loading…</div></div>
  if (!post) return <div className="page"><button className="back-btn" onClick={onBack}>← Back</button><div className="empty">Post not found.</div></div>

  return (
    <div className="page">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="card" style={{ borderLeft: '3px solid var(--blue)' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="badge">{post.category}</span>
          {post.pinned && <span className="badge">📌 Pinned</span>}
          {post.locked && <span className="badge badge-gold">🔒 Locked</span>}
        </div>
        <h2 style={{ marginBottom: 12, lineHeight: 1.3 }}>{post.title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Avatar name={post.members?.name} size={38} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{post.members?.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{post.members?.company} · {timeAgo(post.created_at)}</div>
          </div>
        </div>
        <PostPhotos photos={post.photos} />
        <p style={{ lineHeight: 1.7, marginBottom: 14, fontSize: 14 }}>{post.content}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="react-btn" onClick={() => react('like', 'posts', postId)}>👍 {post.like_count || 0}</button>
        </div>
      </div>

      {replies.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ color: 'var(--dim)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</div>
          {replies.map(r => (
            <div key={r.id} className="card" style={{ marginLeft: 18, borderLeft: '2px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Avatar name={r.members?.name} size={30} />
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{r.members?.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}> · {r.members?.company} · {timeAgo(r.created_at)}</span>
                </div>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {!post.locked && (
        <div style={{ marginTop: 12 }}>
          <textarea placeholder="Write a reply…" value={replyText} onChange={e => setReplyText(e.target.value)} style={{ minHeight: 80 }} />
          <button className="btn" style={{ marginTop: 8, width: '100%' }} onClick={submitReply}>Post Reply</button>
        </div>
      )}
      {post.locked && <div style={{ marginTop: 12, textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 12, background: 'var(--bg)', borderRadius: 8 }}>🔒 Locked by admin.</div>}

      {isAdmin && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`chip${post.pinned ? ' active' : ''}`} onClick={togglePin}>📌 {post.pinned ? 'Unpin' : 'Pin'}</button>
          <button className={`chip${post.locked ? ' active' : ''}`} style={post.locked ? { background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' } : {}} onClick={toggleLock}>🔒 {post.locked ? 'Unlock' : 'Lock'}</button>
          <button className="btn-danger btn-sm" onClick={deletePost}>Delete Post</button>
        </div>
      )}
    </div>
  )
}

function NewPost({ onBack, onSuccess }) {
  const { currentUser } = useAuth()
  const [form, setForm] = useState({ title: '', content: '', category: 'General', pinned: false })
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)

  async function handleFiles(files) {
    const dataUrls = await Promise.all(files.map(readFileAsDataURL))
    setPhotos(p => [...p, ...dataUrls])
  }

  async function submit() {
    if (!form.title || !form.content) return
    setLoading(true)
    try {
      // Upload photos to Supabase Storage
      const uploadedUrls = []
      for (const dataUrl of photos) {
        const blob = await (await fetch(dataUrl)).blob()
        const filename = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { data, error } = await supabase.storage.from('ccee-media').upload(filename, blob, { contentType: 'image/jpeg' })
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('ccee-media').getPublicUrl(filename)
          uploadedUrls.push(publicUrl)
        }
      }
      await supabase.from('posts').insert({
        ...form,
        author_id: currentUser.id,
        photos: uploadedUrls,
        like_count: 0,
        reply_count: 0,
        locked: false,
      })
      onSuccess()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 style={{ marginBottom: 20 }}>New Post <span className="admin-tag">ADMIN</span></h2>
      <label className="label" style={{ marginTop: 0 }}>Category</label>
      <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
        {FORUM_CATS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
      </select>
      <label className="label">Title</label>
      <input placeholder="What's this about?" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      <label className="label">Content</label>
      <textarea placeholder="Share details, context, or a question…" style={{ minHeight: 120 }} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
      <label className="label">Photos (optional)</label>
      <PhotoUpload label="📷 Add photos to this post" multiple onFiles={handleFiles} />
      <ThumbGrid photos={photos} />
      {photos.length > 0 && <button className="btn-danger btn-sm" style={{ marginTop: 4 }} onClick={() => setPhotos([])}>Remove all photos</button>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <input type="checkbox" id="pin-check" style={{ width: 'auto' }} checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} />
        <label htmlFor="pin-check" style={{ fontSize: 14, fontWeight: 600 }}>Pin this post</label>
      </div>
      <button className="btn" style={{ marginTop: 14, width: '100%' }} onClick={submit} disabled={loading}>
        {loading ? 'Publishing…' : 'Publish Post'}
      </button>
    </div>
  )
}
