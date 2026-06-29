import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { Avatar, InfoRow } from './UI.jsx'
import { SECTORS } from '../lib/utils.js'

export default function Directory() {
  const { currentUser } = useAuth()
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All Sectors')
  const [tag, setTag] = useState('all')
  const [viewId, setViewId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('members').select('*').eq('status', 'approved').order('name')
      .then(({ data }) => { setMembers(data || []); setLoading(false) })
  }, [])

  const filtered = members.filter(m => {
    const ms = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.company.toLowerCase().includes(search.toLowerCase())
    const msc = sector === 'All Sectors' || m.sector === sector
    const mt = tag === 'all' || (tag === 'offering' && m.offer) || (tag === 'looking' && m.looking)
    return ms && msc && mt
  })

  const viewed = viewId ? members.find(m => m.id === viewId) : null
  if (viewed) return <MemberProfile member={viewed} onBack={() => setViewId(null)} currentUser={currentUser} />

  return (
    <div className="page">
      <div className="page-hdr">
        <h1>Members</h1>
        <span style={{ color: 'var(--dim)', fontSize: 13, fontWeight: 500 }}>{filtered.length} members</span>
      </div>
      <input placeholder="Search name, company…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 10 }} />
      <select value={sector} onChange={e => setSector(e.target.value)} style={{ marginBottom: 10 }}>
        {SECTORS.map(s => <option key={s}>{s}</option>)}
      </select>
      <div className="chips">
        {[['all', 'All'], ['offering', 'Offering'], ['looking', 'Looking For']].map(([v, l]) => (
          <button key={v} className={`chip${tag === v ? ' active' : ''}`} onClick={() => setTag(v)}>{l}</button>
        ))}
      </div>
      {loading ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>Loading…</div> : (
        <div className="grid-2">
          {filtered.map(m => (
            <div key={m.id} className="member-card" onClick={() => setViewId(m.id)}>
              <Avatar name={m.name} size={50} />
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8, marginBottom: 2 }}>{m.name}</div>
              <div style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{m.company}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 6 }}>{m.designation}</div>
              {m.board_role && <span className="badge badge-green" style={{ fontSize: 10 }}>{m.board_role}</span>}
              {m.role === 'admin' && <span className="badge badge-gold" style={{ fontSize: 10, marginLeft: 2 }}>Admin</span>}
              {m.offer && <div style={{ color: 'var(--dim)', fontSize: 11, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>{m.offer}</div>}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ gridColumn: '1/-1' }}><div className="empty">No members match your filter.</div></div>}
        </div>
      )}
    </div>
  )
}

function MemberProfile({ member: m, onBack, currentUser }) {
  const isAdmin = currentUser?.role === 'admin'
  const [toast, setToast] = useState(null)

  return (
    <div className="page">
      <button className="back-btn" onClick={onBack}>← Back to Members</button>
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <Avatar name={m.name} size={68} />
        <h2 style={{ marginTop: 12, marginBottom: 4 }}>{m.name}</h2>
        <div style={{ color: 'var(--blue)', fontWeight: 700, marginBottom: 4 }}>{m.company}</div>
        <div style={{ color: 'var(--muted)', marginBottom: 10, fontSize: 13 }}>{m.designation}</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {m.board_role && <span className="badge badge-green">{m.board_role}</span>}
          {m.role === 'admin' && <span className="badge badge-gold">⭐ Admin</span>}
          <span className="badge">{m.sector}</span>
        </div>
      </div>
      <div className="card">
        <InfoRow label="City" value={m.city} />
        <InfoRow label="Phone" value={m.phone} />
        {m.offer && <InfoRow label="Offering" value={m.offer} />}
        {m.looking && <InfoRow label="Looking for" value={m.looking} />}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <a href={`tel:${m.phone}`} className="btn" style={{ flex: 1, textAlign: 'center' }}>📞 Call</a>
        <a href={`https://wa.me/91${m.phone}`} target="_blank" rel="noreferrer" className="btn btn-green" style={{ flex: 1, textAlign: 'center' }}>💬 WhatsApp</a>
      </div>
    </div>
  )
}
