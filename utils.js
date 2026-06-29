export const SECTORS = [
  'All Sectors','Automation & Smart Tech','Chamber / Association',
  'Consulting & Business Services','Construction & Real Estate','Digital Marketing',
  'Education & Training','Electrical & MEP','Finance & Investments','Fire & Safety',
  'Food & Hospitality','Facilities & Services','Gifting & Events',
  'Hardware & Building Materials','Health & Wellness','Interior & Furnishing',
  'IT & Networking','Manufacturing & Fabrication','Renewable Energy',
]

export const FORUM_CATS = ['All','Announcements','Opportunities','Ask the Chamber','General','Events Feedback']
export const RES_CATS = ['All','Templates','Policy Updates','Event Recordings','Member Benefits']

export const AV_COLORS = ['#2563a8','#1a4a8a','#2d7a3a','#7c3aed','#b45309','#0e7490','#be185d','#047857']

export function getAvatarColor(name) {
  return AV_COLORS[(name || 'A').charCodeAt(0) % AV_COLORS.length]
}

export function getInitials(name) {
  return (name || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2)
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}
