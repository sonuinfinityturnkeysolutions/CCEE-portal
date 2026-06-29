import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { fmtDate } from '../lib/utils.js'
import { RES_CATS } from '../lib/utils.js'

// ── EVENTS ────────────────────────────────────────────────
export function Events() {
  const { currentUser } = useAuth()
  const [events, setEvents] = useState([])
  const [meetings, setMeetings] = useState([])
  const [rsvps, setRsvps] = useState([])
  const [showNewMeet, setShowNewMeet] = useState(false)
  const [loading, setLoading] = useState(true)
  const isAdmin = currentUser?.role === 'admin'

  async function load() {
    const [{ data: ev }, { data: m }, { data: r }] = await Promise.all([
      supabase.from('events').select('*, rsvp_count').order('event_date'),
      supabase.from('weekly_meetings').select('*').order('meeting_date'),
      supabase.from('event_rsvps').select('event_id').eq('member_id', currentUser.id),
    ])
    setEvents(ev || [])
    setMeetings(m || [])
    setRsvps((r || []).map(x => x.event_id))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleRsvp(eventId) {
    const already = rsvps.includes(eventId)
    if (already) {
      await supabase.from('event_rsvps').delete().match({ event_id: eventId, member_id: currentUser.id })
      setRsvps(r => r.filter(id => id !== eventId))
      setEvents(ev => ev.map(e => e.id === eventId ? { ...e, rsvp_count: (e.rsvp_count || 1) - 1 } : e))
    } else {
      await supabase.from('event_rsvps').insert({ event_id: eventId, member_id: currentUser.id })
      setRsvps(r => [...r, eventId])
      setEvents(ev => ev.map(e => e.id === eventId ? { ...e, rsvp_count: (e.rsvp_count || 0) + 1 } : e))
    }
  }

  async function deleteMeeting(id) {
    if (!confirm('Delete this meeting?')) return
    await supabase.from('weekly_meetings').delete().eq('id', id)
    setMeetings(m => m.filter(x => x.id !== id))
  }

  const upcoming = events.filter(e => !e.is_past)
  const past = events.filter(e => e.is_past)
  const upcomingMeets = meetings.filter(m => new Date(m.meeting_date) >= new Date())

  return (
    <div className="page">
      <div className="page-hdr">
        <h1>Events</h1>
        {isAdmin && <button className="btn btn-sm" onClick={() => setShowNewMeet(!showNewMeet)}>+ Schedule</button>}
      </div>

      {showNewMeet && isAdmin && (
        <NewMeeting onSave={async (data) => {
          const { data: m } = await supabase.from('weekly_meetings').insert(data).select().single()
          setMeetings(x => [...x, m])
          setShowNewMeet(false)
        }} onCancel={() => setShowNewMeet(false)} />
      )}

      {loading ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>Loading…</div> : (
        <>
          {upcomingMeets.length > 0 && (
            <>
              <div className="section-lbl">WEEKLY MEETINGS <span className="admin-tag">ADMIN-SCHEDULED</span></div>
              {upcomingMeets.map(m => (
                <div key={m.id} className="card" style={{ borderLeft: '3px solid var(--green)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{m.title}</div>
                  <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📅 {fmtDate(m.meeting_date)} · {m.time}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>📍 {m.location}</div>
                  {isAdmin && <button className="btn-danger btn-sm" style={{ marginTop: 10 }} onClick={() => deleteMeeting(m.id)}>Delete</button>}
                </div>
              ))}
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <div className="section-lbl" style={{ marginTop: upcomingMeets.length ? 16 : 0 }}>UPCOMING EVENTS</div>
              {upcoming.map(e => <EventCard key={e.id} event={e} rsvped={rsvps.includes(e.id)} onRsvp={toggleRsvp} />)}
            </>
          )}

          {past.length > 0 && (
            <>
              <div className="section-lbl dim">PAST EVENTS</div>
              {past.map(e => <EventCard key={e.id} event={e} rsvped={rsvps.includes(e.id)} onRsvp={toggleRsvp} past />)}
            </>
          )}

          {events.length === 0 && upcomingMeets.length === 0 && <div className="empty">No events scheduled yet.</div>}
        </>
      )}
    </div>
  )
}

function EventCard({ event: e, rsvped, onRsvp, past }) {
  return (
    <div className="card" style={{ opacity: past ? .75 : 1 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <span className="badge">{e.event_type}</span>
        {past && <span className="badge" style={{ background: 'var(--bg)' }}>Archived</span>}
      </div>
      <h3 style={{ marginBottom: 6, lineHeight: 1.3 }}>{e.title}</h3>
      <div style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📅 {fmtDate(e.event_date)} · {e.event_time}</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>📍 {e.location}</div>
      <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{e.description}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--dim)', fontSize: 13, fontWeight: 500 }}>👥 {e.rsvp_count || 0} attending</span>
        {!past && (
          <button
            className={rsvped ? '' : 'btn btn-sm'}
            style={rsvped ? { background: 'var(--green-light)', color: 'var(--green)', border: '1.5px solid var(--green)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700 } : {}}
            onClick={() => onRsvp(e.id)}
          >
            {rsvped ? '✓ Attending' : 'RSVP'}
          </button>
        )}
        {past && e.recording_url && <a href={e.recording_url} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">🎬 Recording</a>}
      </div>
    </div>
  )
}

function NewMeeting({ onSave, onCancel }) {
  const [form, setForm] = useState({ title: '', meeting_date: '', time: '9:00 AM', location: 'The Leela Palace, Chennai' })
  return (
    <div className="card" style={{ border: '2px solid var(--blue)', marginBottom: 14 }}>
      <h3 style={{ marginBottom: 14 }}>Schedule Weekly Meeting <span className="admin-tag">ADMIN</span></h3>
      <label className="label" style={{ marginTop: 0 }}>Meeting Title *</label>
      <input placeholder="e.g. CCEE Weekly Meet #2" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      <label className="label">Date *</label>
      <input type="date" value={form.meeting_date} onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))} />
      <label className="label">Time</label>
      <input value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
      <label className="label">Venue</label>
      <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn" style={{ flex: 1 }} onClick={() => form.title && form.meeting_date && onSave(form)}>Save Meeting</button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── RESOURCES ─────────────────────────────────────────────
export function Resources() {
  const { currentUser } = useAuth()
  const [resources, setResources] = useState([])
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [loading, setLoading] = useState(true)
  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    supabase.from('resources').select('*, members(name)').order('created_at', { ascending: false })
      .then(({ data }) => { setResources(data || []); setLoading(false) })
  }, [])

  const filtered = resources.filter(r => {
    const ms = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
    return ms && (cat === 'All' || r.category === cat)
  })

  const typeIcon = { PDF: '📄', Video: '🎬', PPT: '📊' }

  async function deleteResource(id) {
    if (!confirm('Delete this resource?')) return
    await supabase.from('resources').delete().eq('id', id)
    setResources(r => r.filter(x => x.id !== id))
  }

  return (
    <div className="page">
      <div className="page-hdr">
        <h1>Resources</h1>
        {isAdmin && <button className="btn btn-sm" onClick={() => alert('Use Admin panel to add resources.')}>+ Add</button>}
      </div>
      {!isAdmin && (
        <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: 'var(--blue)' }}>
          📁 Resources are uploaded by CCEE admins. Download any file below.
        </div>
      )}
      <input placeholder="Search by title or tag…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 10 }} />
      <div className="chips">
        {RES_CATS.map(c => <button key={c} className={`chip${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      {loading ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>Loading…</div> : filtered.map(r => (
        <div key={r.id} className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 32 }}>{typeIcon[r.file_type] || '📁'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{r.title}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                <span className="badge">{r.category}</span>
                <span className="badge" style={{ background: 'var(--bg)' }}>{r.file_type}</span>
                {r.tags?.map(t => <span key={t} className="badge" style={{ background: '#f0fdf4', color: 'var(--green)', fontSize: 10 }}>#{t}</span>)}
              </div>
              <div style={{ color: 'var(--dim)', fontSize: 12 }}>By {r.members?.name} · {fmtDate(r.created_at)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href={r.file_url || '#'} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ textAlign: 'center' }}>↓ Download</a>
              {isAdmin && <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => deleteResource(r.id)}>Delete</button>}
            </div>
          </div>
        </div>
      ))}
      {!loading && filtered.length === 0 && <div className="empty">No resources found.</div>}
    </div>
  )
}
