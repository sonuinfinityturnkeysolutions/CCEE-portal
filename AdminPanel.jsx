import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { Avatar } from './UI.jsx'

export default function AdminPanel() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState([])
  const [members, setMembers] = useState([])
  const [posts, setPosts] = useState([])
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: m }, { data: po }] = await Promise.all([
        supabase.from('members').select('*').eq('status', 'pending'),
        supabase.from('members').select('*').eq('status', 'approved').order('name'),
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
      ])
      setPending(p || []); setMembers(m || []); setPosts(po || [])
      setLoading(false)
    }
    load()
  }, [])

  async function approveMember(m) {
    // Create Supabase auth user for the new member
    const email = `${m.phone}@ccee.member`
    const password = m.temp_password || Math.random().toString(36).slice(2, 8).toUpperCase()

    // Use admin API to create user (this works with service role key, or use invite)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name: m.name }
    })

    if (authErr) {
      // Fallback: just update status without creating auth user
      console.warn('Auth creation failed, updating status only:', authErr.message)
    }

    await supabase.from('members').update({
      status: 'approved',
      auth_id: authData?.user?.id || null,
      email,
    }).eq('id', m.id)

    setPending(p => p.filter(x => x.id !== m.id))
    setMembers(prev => [...prev, { ...m, status: 'approved' }])
    showToast(`${m.name} approved! Their password is: ${password}`)
  }

  async function rejectMember(id) {
    if (!confirm('Reject this application?')) return
    await supabase.from('members').update({ status: 'rejected' }).eq('id', id)
    setPending(p => p.filter(x => x.id !== id))
    showToast('Application rejected.')
  }

  async function toggleAdmin(m) {
    const newRole = m.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`${newRole === 'admin' ? 'Make' : 'Remove'} admin for ${m.name}?`)) return
    await supabase.from('members').update({ role: newRole }).eq('id', m.id)
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, role: newRole } : x))
    showToast(`${m.name} is now ${newRole}.`)
  }

  async function suspendMember(m) {
    if (!confirm(`Suspend ${m.name}?`)) return
    await supabase.from('members').update({ status: 'suspended' }).eq('id', m.id)
    setMembers(prev => prev.filter(x => x.id !== m.id))
    showToast(`${m.name} suspended.`)
  }

  async function togglePin(post) {
    await supabase.from('posts').update({ pinned: !post.pinned }).eq('id', post.id)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, pinned: !p.pinned } : p))
    showToast('Updated.')
  }

  async function toggleLock(post) {
    await supabase.from('posts').update({ locked: !post.locked }).eq('id', post.id)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, locked: !p.locked } : p))
    showToast('Updated.')
  }

  async function deletePost(id) {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    showToast('Post deleted.')
  }

  return (
    <div className="page">
      {toast && <div className="toast ok">{toast}</div>}
      <h1 style={{ marginBottom: 4 }}>Admin Panel</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Manage members, content & platform.</p>

      <div className="chips">
        <button className={`chip${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>Pending ({pending.length})</button>
        <button className={`chip${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>Members</button>
        <button className={`chip${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>Posts</button>
        <button className={`chip${tab === 'pwsheet' ? ' active' : ''}`} onClick={() => setTab('pwsheet')}>Passwords</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>Loading…</div> : (
        <>
          {/* ── PENDING ── */}
          {tab === 'pending' && (
            pending.length === 0
              ? <div className="empty">🎉 No pending applications.</div>
              : pending.map(m => (
                <div key={m.id} className="card">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <Avatar name={m.name} size={42} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                      <div style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 600 }}>{m.company}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{m.designation} · {m.sector}</div>
                      <div style={{ color: 'var(--dim)', fontSize: 12 }}>{m.city} · {m.phone}</div>
                    </div>
                  </div>
                  {m.offer && <div style={{ fontSize: 13, marginBottom: 4 }}><b style={{ color: 'var(--dim)' }}>Offers: </b>{m.offer}</div>}
                  {m.looking && <div style={{ fontSize: 13, marginBottom: 12 }}><b style={{ color: 'var(--dim)' }}>Looking: </b>{m.looking}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" style={{ flex: 1 }} onClick={() => approveMember(m)}>✓ Approve</button>
                    <button className="btn-danger" style={{ flex: 1 }} onClick={() => rejectMember(m.id)}>✗ Reject</button>
                  </div>
                </div>
              ))
          )}

          {/* ── MEMBERS ── */}
          {tab === 'members' && (
            <>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>{members.length} approved members</div>
              {members.map(m => (
                <div key={m.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: m.id !== currentUser.id ? 10 : 0 }}>
                    <Avatar name={m.name} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{m.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.company}</div>
                      <div style={{ color: 'var(--dim)', fontSize: 11 }}>{m.phone}</div>
                    </div>
                    <span className={`badge${m.role === 'admin' ? ' badge-gold' : ''}`}>{m.role === 'admin' ? '⭐ Admin' : 'Member'}</span>
                  </div>
                  {m.id !== currentUser.id && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className={m.role === 'admin' ? 'btn-danger btn-sm' : 'btn-ghost btn-sm'} style={{ flex: 1 }} onClick={() => toggleAdmin(m)}>
                        {m.role === 'admin' ? 'Remove Admin' : '⭐ Make Admin'}
                      </button>
                      <button className="btn-warn btn-sm" style={{ flex: 1 }} onClick={() => suspendMember(m)}>Suspend</button>
                    </div>
                  )}
                  {m.id === currentUser.id && <div style={{ fontSize: 11, color: 'var(--dim)', fontStyle: 'italic' }}>You (logged in)</div>}
                </div>
              ))}
            </>
          )}

          {/* ── POSTS ── */}
          {tab === 'posts' && posts.map(p => (
            <div key={p.id} className="card">
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14, lineHeight: 1.3 }}>{p.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>{p.category} · {p.reply_count || 0} replies</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className={`chip${p.pinned ? ' active' : ''}`} onClick={() => togglePin(p)}>📌 {p.pinned ? 'Unpin' : 'Pin'}</button>
                <button className={`chip${p.locked ? ' active' : ''}`}
                  style={p.locked ? { background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' } : {}}
                  onClick={() => toggleLock(p)}>🔒 {p.locked ? 'Unlock' : 'Lock'}</button>
                <button className="btn-danger btn-sm" onClick={() => deletePost(p.id)}>Delete</button>
              </div>
            </div>
          ))}

          {/* ── PASSWORD SHEET ── */}
          {tab === 'pwsheet' && (
            <div>
              <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13, color: 'var(--blue)' }}>
                📋 These are the initial passwords set when members were approved. Members who changed their password won't be shown the new password here — only the original.
              </div>
              <table className="pw-table">
                <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Init. Password</th></tr></thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr key={m.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.phone}</td>
                      <td style={{ fontFamily: 'monospace', letterSpacing: 1, color: 'var(--blue)', fontWeight: 700 }}>{m.temp_password || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
