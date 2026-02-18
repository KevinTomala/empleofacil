import { useEffect, useState } from 'react'
import Header from '../../components/Header'
import { getMyPerfil, getPerfilErrorMessage } from '../../services/perfilCandidato.api'
import ProfileSidebarStatus from './ProfileSidebarStatus'
import ProfileTabs from './ProfileTabs'

export default function ProfileWizardLayout({
  currentTab,
  title,
  description,
  phase2Notice,
  sidebarContext,
  isSectionComplete = false,
  onCancel,
  contextAlerts = [],
  children
}) {
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadPerfilSidebar() {
      try {
        setLoading(true)
        const data = await getMyPerfil()
        if (!active) return
        setPerfil(data)
        setError('')
      } catch (err) {
        if (!active) return
        setError(getPerfilErrorMessage(err, 'No se pudo cargar el estado del perfil.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPerfilSidebar()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-8">
        <ProfileTabs current={currentTab} />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="font-heading text-2xl font-semibold">{title}</h1>
              <p className="text-sm text-foreground/70">{description}</p>
              {phase2Notice && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {phase2Notice}
                </p>
              )}
            </div>

            {children}
          </div>

          <aside className="lg:sticky lg:top-24">
            <ProfileSidebarStatus
              perfil={perfil}
              loading={loading}
              error={error}
              currentTab={currentTab}
              isSectionComplete={isSectionComplete}
              contextAlerts={contextAlerts}
              lastSavedText={sidebarContext?.lastSavedText}
            />
          </aside>
        </section>
      </main>
    </div>
  )
}
