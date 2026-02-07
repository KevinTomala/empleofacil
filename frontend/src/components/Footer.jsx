import { Briefcase } from 'lucide-react'

const links = {
  plataforma: [
    { label: 'Para Empresas', href: '#beneficios-empresas' },
    { label: 'Para Candidatos', href: '#beneficios-candidatos' },
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Precios', href: '#' },
  ],
  recursos: [
    { label: 'Centro de Ayuda', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Guias', href: '#' },
    { label: 'FAQ', href: '#' },
  ],
  legal: [
    { label: 'Terminos de Servicio', href: '#' },
    { label: 'Politica de Privacidad', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-foreground text-white">
      <div className="page-container py-24">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-5 items-start mb-14">
          {/* Brand */}
          <div className="lg:col-span-2 text-left">
            <a href="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <span className="font-heading font-bold text-xl">EmpleoFácil</span>
            </a>

            <p className="text-white/70 max-w-sm mb-4 leading-relaxed">
              La plataforma de empleo que conecta talento y empresas en Ecuador.
            </p>
            <p className="text-white/50 text-sm">
              Conectando talento con oportunidades desde 2024.
            </p>
          </div>

          {/* Links */}
          <div className="text-left">
            <h4 className="font-semibold mb-5">Plataforma</h4>
            <ul className="space-y-3">
              {links.plataforma.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-left">
            <h4 className="font-semibold mb-5">Recursos</h4>
            <ul className="space-y-3">
              {links.recursos.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-left">
            <h4 className="font-semibold mb-5">Legal</h4>
            <ul className="space-y-3">
              {links.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-white/40 text-sm">
            2024 EmpleoFácil · Alpha Technologies. Todos los derechos reservados.
          </p>
          <span className="text-white/40 text-sm md:text-right">
            Hecho con dedicacion en Ecuador
          </span>
        </div>
      </div>
    </footer>
  )
}
