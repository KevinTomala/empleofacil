import Header from '../../components/Header'
import Hero from '../../components/Hero'
import BeneficiosEmpresas from '../../components/BeneficiosEmpresas'
import BeneficiosAgentes from '../../components/BeneficiosAgentes'
import ComoFunciona from '../../components/ComoFunciona'
import ModalidadesContratacion from '../../components/ModalidadesContratacion'
import CTA from '../../components/CTA'
import Contacto from '../../components/Contacto'
import Footer from '../../components/Footer'
import ScrollToTop from '../../components/ScrollToTop'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <BeneficiosAgentes />
        <BeneficiosEmpresas />
        <ModalidadesContratacion />
        <ComoFunciona />
        <CTA />
        <Contacto />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}
