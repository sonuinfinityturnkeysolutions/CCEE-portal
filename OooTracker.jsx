import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { Avatar, PhotoUpload, ThumbGrid } from './UI.jsx'
import { fmtDate, readFileAsDataURL, getInitials, getAvatarColor } from '../lib/utils.js'

export default function OooTracker() {
  const { currentUser } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [members, setMembers] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [{ data: m }, { data: mem }] = await Promise.all([
      supabase.from('ooo_meetings').select('*, from_member:members!ooo_meetings_from_id_fkey(name,company), to_member:members!ooo_meetings_to_id_fkey(name,company)')
        .or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`)
        .order('meeting_date', { ascending: false }),
      supabase.from('members').select('id, name, company').eq('status', 'approved').neq('id', currentUser.id),
    ])
    setMeetings(m || [])
    setMembers(mem || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalRefs = meetings.filter(o => o.from_id === currentUser.id && o.referral_given).length
  const totalReceived = meetings.filter(o => o.to_id === currentUser.id && o.referral_given).length

  async function deleteMeeting(id) {
    if (!confirm('Remove this meeting log?')) return
    await supabase.from('ooo_meetings').delete().eq('id', id)
    setMeetings(m => m.filter(x => x.id !== id))
  }

  if (showNew) return (
    <NewOoo members={members} currentUser={currentUser}
      onBack={() => setShowNew(false)}
      onSuccess={() => { setShowNew(false); load() }} />
  )

  return (
    <div className="page">
      <div className="page-hdr">
        <h1>1-to-1 Tracker</h1>
        <button className="btn btn-sm" onClick={() => setShowNew(true)}>+ Log Meeting</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
        Log your one-to-one meetings with fellow CCEE members and track referrals.
      </p>
      <div className="stat-row">
        <div className="stat-box"><div className="stat-num">{meetings.length}</div><div className="stat-lbl">Meetings</div></div>
        <div className="stat-box" style={{ background: 'var(--green-light)' }}>
          <div className="stat-num" style={{ color: 'var(--green)' }}>{totalRefs}</div>
          <div className="stat-lbl">Referrals Given</div>
        </div>
        <div className="stat-box" style={{ background: '#fef3c7' }}>
          <div className="stat-num" style={{ color: '#92400e' }}>{totalReceived}</div>
          <div className="stat-lbl">Referrals Received</div>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>Loading…</div> : (
        meetings.length === 0
          ? <div className="empty">No 1-to-1 meetings logged yet.<br />Tap "+ Log Meeting" to add your first.</div>
          : meetings.map(o => {
            const isMine = o.from_id === currentUser.id
            const other = isMine ? o.to_member : o.from_member
            return (
              <div key={o.id} className="ooo-card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="ooo-avatar" style={{ background: getAvatarColor(other?.name) }}>
                    {getInitials(other?.name || '?')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{other?.name || 'Unknown'}</div>
                        <div style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{other?.company}</div>
                        <div style={{ color: 'var(--dim)', fontSize: 12, marginBottom: 6 }}>
                          📅 {fmtDate(o.meeting_date)} {isMine ? '· you initiated' : ''}
                        </div>
                      </div>
                      {isMine && (
                        <button className="btn-danger" style={{ padding: '4px 8px', fontSize: 11, flexShrink: 0 }} onClick={() => deleteMeeting(o.id)}>✕</button>
                      )}
                    </div>
                    {o.notes && (
                      <div style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.5, background: 'var(--bg)', padding: 8, borderRadius: 7 }}>{o.notes}</div>
                    )}
                    {/* Meeting photos */}
                    {o.photos?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        {o.photos.map((p, i) => <img key={i} src={p} style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', border: '1.5px solid var(--border)' }} alt="" />)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {o.referral_given && <span className="badge badge-green">✓ Referral given{o.referral_value ? ': ' + o.referral_value : ''}</span>}
                      {!isMine && o.referral_given && <span className="badge badge-gold">⭐ You received a referral</span>}
                    </div>
                    {o.referral_given && o.referral_photo && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4, fontWeight: 600 }}>REFERRAL PHOTO</div>
                        <img src={o.referral_photo} className="ref-photo" alt="referral" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
      )}
    </div>
  )
}

function NewOoo({ members, currentUser, onBack, onSuccess }) {
  const [form, setForm] = useState({ toId: '', date: new Date().toISOString().slice(0, 10), notes: '', referralGiven: false, referralValue: '' })
  const [photos, setPhotos] = useState([])
  const [refPhoto, setRefPhoto] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleMeetingPhotos(files) {
    const urls = await Promise.all(files.map(readFileAsDataURL))
    setPhotos(p => [...p, ...urls])
  }
  async function handleRefPhoto(files) {
    if (files[0]) setRefPhoto(await readFileAsDataURL(files[0]))
  }

  async function uploadImage(dataUrl, folder) {
    const blob = await (await fetch(dataUrl)).blob()
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const { error } = await supabase.storage.from('ccee-media').upload(filename, blob, { contentType: 'image/jpeg' })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('ccee-media').getPublicUrl(filename)
    return publicUrl
  }

  async function submit() {
    if (!form.toId) return
    setLoading(true)
    try {
      const uploadedPhotos = await Promise.all(photos.map(p => uploadImage(p, 'ooo')))
      const uploadedRefPhoto = refPhoto ? await uploadImage(refPhoto, 'referrals') : null

      await supabase.from('ooo_meetings').insert({
        from_id: currentUser.id,
        to_id: parseInt(form.toId),
        meeting_date: form.date,
        notes: form.notes,
        photos: uploadedPhotos.filter(Boolean),
        referral_given: form.referralGiven,
        referral_value: form.referralValue,
        referral_photo: uploadedRefPhoto,
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
      <h2 style={{ marginBottom: 20 }}>Log a 1-to-1 Meeting</h2>
      <label className="label" style={{ marginTop: 0 }}>Member you met *</label>
      <select value={form.toId} onChange={e => setForm(p => ({ ...p, toId: e.target.value }))}>
        <option value="">— Select a member —</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.company}</option>)}
      </select>
      <label className="label">Date of meeting *</label>
      <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
      <label className="label">Meeting notes</label>
      <textarea placeholder="What did you discuss? Any outcomes?" style={{ minHeight: 90 }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      <label className="label">Meeting Photos (optional)</label>
      <PhotoUpload label="📷 Add meeting photo(s)" multiple onFiles={handleMeetingPhotos} />
      <ThumbGrid photos={photos} />
      {photos.length > 0 && <button className="btn-danger btn-sm" style={{ marginTop: 4 }} onClick={() => setPhotos([])}>Remove photos</button>}

      <div style={{ marginTop: 14, padding: 12, background: 'var(--bg)', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="ref-check" style={{ width: 'auto' }} checked={form.referralGiven} onChange={e => setForm(p => ({ ...p, referralGiven: e.target.checked }))} />
          <label htmlFor="ref-check" style={{ fontSize: 14, fontWeight: 600 }}>I gave a referral in this meeting</label>
        </div>
        {form.referralGiven && (
          <div>
            <label className="label">Referral details</label>
            <input placeholder="e.g. Introduced to Packiaraj for construction work" value={form.referralValue} onChange={e => setForm(p => ({ ...p, referralValue: e.target.value }))} />
            <label className="label">Referral Photo (optional)</label>
            <PhotoUpload label="📸 Upload referral photo" onFiles={handleRefPhoto} />
            {refPhoto && <img src={refPhoto} style={{ width: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'cover', marginTop: 8, border: '1.5px solid var(--border)' }} alt="" />}
          </div>
        )}
      </div>

      <button className="btn" style={{ marginTop: 16, width: '100%' }} onClick={submit} disabled={loading || !form.toId || !form.date}>
        {loading ? 'Saving…' : 'Save Meeting'}
      </button>
    </div>
  )
}
