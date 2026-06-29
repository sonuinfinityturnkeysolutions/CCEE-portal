import { useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { Logo, Toast } from './UI.jsx'
import { supabase } from '../lib/supabase.js'
import { SECTORS } from '../lib/utils.js'

export default function AuthScreen() {
  const { signIn } = useAuth()
  const [mode, setMode] = useState('login') // login | signup | pending
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  function showErr(msg) {
    setToast({ message: msg, type: 'err' })
    setTimeout(() => setToast(null), 3500)
  }

  if (mode === 'pending') return (
    <div className="auth-wrap">
      <Toast {...(toast || {})} />
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <Logo />
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <h2 style={{ marginBottom: 8 }}>Application Submitted</h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: 14 }}>
          Your application is with the CCEE admin for review. You'll be contacted once approved.
        </p>
        <button className="btn" style={{ marginTop: 24, width: '100%' }} onClick={() => setMode('login')}>
          Back to Login
        </button>
      </div>
    </div>
  )

  if (mode === 'signup') return <SignupForm onBack={() => setMode('login')} onSuccess={() => setMode('pending')} showErr={showErr} toast={toast} setToast={setToast} />

  return (
    <div className="auth-wrap">
      <Toast {...(toast || {})} />
      <div className="auth-card">
        <Logo />
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Member Login</h2>
        <LoginForm signIn={signIn} showErr={showErr} setLoading={setLoading} loading={loading} />
        <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--muted)', fontSize: 13 }}>
          Not a member yet?{' '}
          <a href="#" onClick={e => { e.preventDefault(); setMode('signup') }} style={{ color: 'var(--blue)', fontWeight: 600 }}>
            Apply for Membership
          </a>
        </p>
        <hr className="divider" />
        <p style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'center', lineHeight: 1.6 }}>
          First login? Use the password shared by CCEE admin.<br />You can change it after signing in.
        </p>
      </div>
    </div>
  )
}

function LoginForm({ signIn, showErr, setLoading, loading }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  async function handleLogin() {
    if (!phone || !password) { showErr('Please enter phone and password.'); return }
    setLoading(true)
    try {
      await signIn(phone.trim(), password.trim())
    } catch (e) {
      showErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <label className="label">Phone Number</label>
      <input type="tel" placeholder="Your registered mobile number" value={phone} onChange={e => setPhone(e.target.value)} />
      <label className="label">Password</label>
      <input type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLogin()} />
      <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={handleLogin} disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In →'}
      </button>
    </>
  )
}

function SignupForm({ onBack, onSuccess, showErr, toast, setToast }) {
  const [form, setForm] = useState({ name: '', company: '', designation: '', sector: 'Electrical & MEP', city: 'Chennai', phone: '', offer: '', looking: '' })
  const [loading, setLoading] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleApply() {
    if (!form.name || !form.company || !form.phone) { showErr('Name, company & phone are required.'); return }
    setLoading(true)
    try {
      // Create a placeholder email from phone for auth
      const email = `${form.phone}@ccee.member`
      const tempPassword = Math.random().toString(36).slice(2, 8).toUpperCase()

      // Insert pending member
      const { error } = await supabase.from('members').insert({
        ...form,
        email,
        temp_password: tempPassword,
        role: 'member',
        status: 'pending',
      })
      if (error) throw error
      onSuccess()
    } catch (e) {
      showErr(e.message || 'Failed to submit application.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <Toast {...(toast || {})} />
      <div className="auth-card">
        <Logo />
        <h2 style={{ textAlign: 'center', marginBottom: 16 }}>Apply for Membership</h2>
        {[['Full Name *', 'name', 'text'], ['Company Name *', 'company', 'text'], ['Designation', 'designation', 'text'], ['City', 'city', 'text'], ['Phone *', 'phone', 'tel'], ['What you offer', 'offer', 'text'], ['What you\'re looking for', 'looking', 'text']].map(([label, key, type]) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={label.replace(' *', '')} />
          </div>
        ))}
        <label className="label">Industry / Sector</label>
        <select value={form.sector} onChange={e => set('sector', e.target.value)}>
          {SECTORS.filter(s => s !== 'All Sectors').map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={handleApply} disabled={loading}>
          {loading ? 'Submitting…' : 'Submit Application'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 14, color: 'var(--muted)', fontSize: 13 }}>
          Already a member?{' '}
          <a href="#" onClick={e => { e.preventDefault(); onBack() }} style={{ color: 'var(--blue)', fontWeight: 600 }}>Sign In</a>
        </p>
      </div>
    </div>
  )
}
