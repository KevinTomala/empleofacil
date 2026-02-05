import { CheckCircle, Pencil, ShieldCheck } from 'lucide-react'
import Header from '../../components/Header'

export default function CandidateProfile() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-10">
        <section className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="bg-white border border-border rounded-2xl p-6 w-full lg:w-1/3 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                CA
              </span>
              <div>
                <h1 className="font-heading text-xl font-semibold">Candidato Activo</h1>
                <p className="text-sm text-foreground/70">Perfil 70% completo</p>
              </div>
            </div>
            <button className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium">
              Completar perfil
            </button>
          </div>

          <div className="flex-1 space-y-4">
            <div className="bg-white border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Datos personales</h2>
                  <p className="text-sm text-foreground/70">Actualiza tu informacion principal.</p>
                </div>
                <Pencil className="w-4 h-4 text-foreground/60" />
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Experiencia</h2>
                  <p className="text-sm text-foreground/70">Agrega tus trabajos recientes.</p>
                </div>
                <CheckCircle className="w-4 h-4 text-accent" />
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Documentos</h2>
                  <p className="text-sm text-foreground/70">Sube tus certificados y referencias.</p>
                </div>
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
