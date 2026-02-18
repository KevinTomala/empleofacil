import { Link } from 'react-router-dom'

const tabs = [
  { label: 'Informacion basica', to: '/perfil/datos-basicos' },
  { label: 'Datos personales', to: '/perfil/datos-personales' },
  { label: 'Preferencias', to: '/perfil/preferencias' },
  { label: 'Formacion', to: '/perfil/formacion' },
  { label: 'Idiomas', to: '/perfil/idiomas' },
  { label: 'Experiencia', to: '/perfil/experiencia' },
  { label: 'Documentos', to: '/perfil/documentos' }
]

export default function ProfileTabs({ current }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = current === tab.to
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                isActive ? 'bg-primary text-white' : 'bg-slate-50 text-foreground/70 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
