import { Search, Clock, FileCheck, ShieldCheck, Zap, Users } from 'lucide-react'

const beneficios = [
  {
    icon: Search,
    title: 'Busqueda Inteligente',
    description: 'Filtra candidatos por experiencia, ubicacion, disponibilidad y habilidades.'
  },
  {
    icon: Clock,
    title: 'Contratacion Rapida',
    description: 'Publica vacantes y recibe postulaciones de candidatos calificados en cuestion de horas.'
  },
  {
    icon: FileCheck,
    title: 'Documentacion Verificada',
    description: 'Verificacion de documentos y datos clave para contratar con confianza.'
  },
  {
    icon: ShieldCheck,
    title: 'Perfiles Completos',
    description: 'Accede a informacion detallada: formacion, experiencia, certificaciones y referencias.'
  },
  {
    icon: Zap,
    title: 'Multiples Modalidades',
    description: 'Contrata personal temporal, ocasional, fijo, medio tiempo o para eventos especiales.'
  },
  {
    icon: Users,
    title: 'Gestion Centralizada',
    description: 'Administra todas tus vacantes y candidatos desde un solo panel de control.'
  }
]

export default function BeneficiosEmpresas() {
  return (
    <section id="beneficios-empresas" className="py-20 bg-secondary">
      <div className="page-container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Para Empresas
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Encuentra al talento ideal para tu empresa
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto text-lg">
            Simplifica tu proceso de contratacion con acceso directo a candidatos verificados y perfiles completos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {beneficios.map((beneficio, index) => (
            <div
              key={index}
              className="bg-background p-6 rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                <beneficio.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                {beneficio.title}
              </h3>
              <p className="text-foreground/70 leading-relaxed">
                {beneficio.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
            Publicar una Vacante
          </button>
        </div>
      </div>
    </section>
  )
}
