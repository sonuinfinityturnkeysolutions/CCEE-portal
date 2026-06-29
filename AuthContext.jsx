import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setCurrentUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('auth_id', userId)
      .single()
    setCurrentUser(data)
    setLoading(false)
  }

  async function signIn(phone, password) {
    // Find member by phone
    const { data: member } = await supabase
      .from('members')
      .select('email, status')
      .eq('phone', phone)
      .single()

    if (!member) throw new Error('Phone number not found.')
    if (member.status === 'pending') throw new Error('Your application is pending admin approval.')
    if (member.status === 'suspended') throw new Error('Your account has been suspended.')

    const { error } = await supabase.auth.signInWithPassword({
      email: member.email,
      password,
    })
    if (error) throw new Error('Incorrect password.')
  }

  async function signOut() {
    await supabase.auth.signOut()
    setCurrentUser(null)
  }

  async function refreshProfile() {
    if (currentUser?.auth_id) {
      await loadProfile(currentUser.auth_id)
    }
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
