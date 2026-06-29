import { useState } from 'react'
import { AuthProvider, useAuth } from './components/AuthContext.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import Home from './components/Home.jsx'
import Directory from './components/Directory.jsx'
import OooTracker from './components/OooTracker.jsx'
import { Events, Resources } from './components/EventsResources.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import { Logo } from './components/UI.jsx'
import { Avatar } from './components/UI.jsx'
import { Spinner } from './components/UI.jsx'

function AppShell() {
  const { currentUser, loading, signOut } = useAuth()
  const [tab, setTab] = useState('home')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#e8f0fb,#f5f7fa,#e8f5ec)' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/ccee-logo.png" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 16 }} alt="CCEE" onError={e => e.target.style.display = 'none'} />
        <Spinner />
      </div>
    </div>
  )

  if (!currentUser) return <AuthScreen />

  const isAdmin = currentUser.role === 'admin'

  const tabs = [
    { key: 'home', icon: '🏠', label: 'Home' },
    { key: 'directory', icon: '🏢', label: 'Members' },
    { key: 'ooo', icon: '🤝', label: '1-to-1' },
    { key: 'resources', icon: '📁', label: 'Resources' },
    { key: 'events', icon: '📅', label: 'Events' },
    ...(isAdmin ? [{ key: 'admin', icon: '⚙️', label: 'Admin' }] : []),
  ]

  function navigateTo(t) { setTab(t) }

  return (
    <div className="app">
      {/* Top bar */}
      <div className="topbar">
        <Logo compact />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin && <span className="badge badge-gold" style={{ fontSize: 10 }}>ADMIN</span>}
          <Avatar name={currentUser.name} size={34} />
          <button className="logout-btn" onClick={signOut}>Sign Out</button>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        {tab === 'home' && <Home onGoOoo={() => navigateTo('ooo')} onGoEvents={() => navigateTo('events')} />}
        {tab === 'directory' && <Directory />}
        {tab === 'ooo' && <OooTracker />}
        {tab === 'resources' && <Resources />}
        {tab === 'events' && <Events />}
        {tab === 'admin' && isAdmin && <AdminPanel />}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`nav-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span className="nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
