import { Mail, Phone, MapPin, Send } from 'lucide-react'

export default function Contacto() {
  return (
    <section id="contacto" className="py-20 bg-secondary">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left - Info */}
          <div>
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              Contacto
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
              Tienes preguntas? Estamos para ayudarte
            </h2>
            <p className="text-foreground/70 text-lg mb-8">
              Ya sea que tengas dudas sobre la plataforma, necesites soporte o quieras conocer 
              mas sobre nuestros servicios, no dudes en contactarnos.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Email</h3>
                  <p className="text-foreground/70">info@EmpleoFácil.ec</p>
                  <p className="text-foreground/70">soporte@EmpleoFácil.ec</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Telefono</h3>
                  <p className="text-foreground/70">+593 4 123 4567</p>
                  <p className="text-foreground/70">WhatsApp: +593 99 123 4567</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Ubicacion</h3>
                  <p className="text-foreground/70">Guayaquil, Ecuador</p>
                  <p className="text-foreground/70">Lunes a Viernes: 9:00 - 18:00</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className="bg-background p-8 rounded-2xl border border-border shadow-sm">
            <h3 className="font-heading text-xl font-semibold text-foreground mb-6">
              Enviar mensaje
            </h3>
            <form className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-foreground mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-foreground mb-2">
                  Soy
                </label>
                <select
                  id="tipo"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  <option value="">Selecciona una opcion</option>
                  <option value="candidato">Candidato</option>
                  <option value="empresa">Empresa</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label htmlFor="mensaje" className="block text-sm font-medium text-foreground mb-2">
                  Mensaje
                </label>
                <textarea
                  id="mensaje"
                  rows={4}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                  placeholder="En que podemos ayudarte?"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Enviar Mensaje
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
