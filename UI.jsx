import { getInitials, getAvatarColor } from '../lib/utils.js'
import { useEffect, useState } from 'react'

// ── Logo ──────────────────────────────────────────────────
const LOGO_URL = '/ccee-logo.png'

export function Logo({ compact }) {
  if (compact) {
    return (
      <div className="logo-wrap">
        <img src={LOGO_URL} className="logo-img" style={{ width: 36, height: 36 }} alt="CCEE" onError={e => { e.target.style.display = 'none' }} />
        <span className="logo-text">CCEE</span>
      </div>
    )
  }
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
      <img src={LOGO_URL} className="logo-img" style={{ width: 110, height: 110 }} alt="CCEE" onError={e => { e.target.style.display = 'none' }} />
      <div className="logo-text" style={{ fontSize: 20, marginTop: 6 }}>CCEE</div>
      <div className="logo-sub" style={{ textAlign: 'center', fontSize: 11 }}>CHAMBER OF COMMERCE FOR ELITE ENTREPRENEURS</div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ name, size = 40 }) {
  return (
    <div
      className="avatar"
      style={{
        width: size, height: size,
        fontSize: Math.round(size * .34),
        background: getAvatarColor(name),
      }}
    >
      {getInitials(name)}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────
export function Toast({ message, type }) {
  if (!message) return null
  return <div className={`toast ${type}`}>{message}</div>
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner() {
  return <div className="spinner"><div className="spin" /></div>
}

// ── InfoRow ───────────────────────────────────────────────
export function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-val">{value}</span>
    </div>
  )
}

// ── PhotoUpload ───────────────────────────────────────────
export function PhotoUpload({ label = '📷 Add photos', multiple = false, onFiles }) {
  return (
    <label className="photo-upload-label">
      {label}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={async e => {
          const files = [...e.target.files]
          onFiles(files)
          e.target.value = ''
        }}
      />
    </label>
  )
}

// ── ThumbGrid ─────────────────────────────────────────────
export function ThumbGrid({ photos }) {
  if (!photos || photos.length === 0) return null
  return (
    <div className="thumb-grid">
      {photos.map((p, i) => (
        <img key={i} src={p} className="thumb" alt="" />
      ))}
    </div>
  )
}

// ── PostPhotos ────────────────────────────────────────────
export function PostPhotos({ photos }) {
  if (!photos || photos.length === 0) return null
  if (photos.length === 1) {
    return <img src={photos[0]} className="post-photo-single" alt="" />
  }
  return (
    <div className="post-photo-grid">
      {photos.slice(0, 4).map((p, i) => (
        <div key={i} style={{ position: 'relative' }}>
          <img src={p} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, border: '1.5px solid var(--border)' }} />
          {i === 3 && photos.length > 4 && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 700 }}>
              +{photos.length - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
