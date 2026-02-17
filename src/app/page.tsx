import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BarChart3, Lock, Users, Smartphone, Zap, CheckCircle2, Mail, PlayCircle, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-[#0A0A0A]/50 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">PH Hub</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Características</Link>
            <Link href="#solution" className="hover:text-white transition-colors">Solución</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Planes</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#contact" className="hidden md:block text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Soporte
            </Link>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-indigo-500/25 rounded-full px-6">
                Ingresar a Asamblea
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-48 md:pb-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] -z-10" />

        <div className="container mx-auto px-6 text-center">
          <Badge variant="outline" className="mb-6 border-indigo-500/30 text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-full text-sm">
            🚀 Nueva Generación de Asambleas
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
            Gestión de Asambleas <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Inteligente y Segura
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            La solución moderna para propiedad horizontal que garantiza quórum en tiempo real, votaciones transparentes y resultados inmediatos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full h-12 px-8 text-base bg-white text-black hover:bg-gray-100 rounded-full">
                Empezar Ahora <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="#solution" className="w-full sm:w-auto">
              <Button size="lg" className="w-full h-12 px-8 text-base bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-full">
                <PlayCircle className="mr-2 w-4 h-4" /> Ver Demo
              </Button>
            </Link>
          </div>

          {/* Stats Preview */}
          <div className="mt-20 p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent max-w-5xl mx-auto">
            <div className="bg-[#0A0A0A] rounded-xl border border-white/5 p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div className="space-y-2">
                <div className="text-sm text-gray-400">Quórum Actual</div>
                <div className="text-4xl font-bold text-emerald-400">68.5%</div>
                <div className="text-xs text-emerald-500/80 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Actualizando en tiempo real
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-400">Asistentes Registrados</div>
                <div className="text-4xl font-bold text-white">423</div>
                <div className="text-xs text-gray-500">De 580 unidades totales</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-400">Votación en Curso</div>
                <div className="text-xl font-medium text-white">Aprobación Presupuesto 2026</div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full w-[75%] bg-gradient-to-r from-indigo-500 to-purple-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-[#0A0A0A]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Todo lo que necesitas para tu asamblea</h2>
            <p className="text-gray-400">Tecnología robusta diseñada para administradores y copropietarios.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Users className="w-6 h-6 text-indigo-400" />}
              title="Registro Instantáneo"
              description="Control de asistencia mediante códigos QR personalizados y cálculo automático de coeficientes."
            />
            <FeatureCard
              icon={<Smartphone className="w-6 h-6 text-pink-400" />}
              title="Votación Móvil"
              description="Interfaz intuitiva para que los asambleístas voten desde sus propios dispositivos sin complicaciones."
            />
            <FeatureCard
              icon={<Lock className="w-6 h-6 text-emerald-400" />}
              title="Seguridad Total"
              description="Validación de identidad, poderes digitales cifrados y auditoría completa de cada voto."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-yellow-400" />}
              title="Resultados en Vivo"
              description="Visualización de gráficas y porcentajes en tiempo real para agilizar la toma de decisiones."
            />
            <FeatureCard
              icon={<CheckCircle2 className="w-6 h-6 text-blue-400" />}
              title="Poderes Digitales"
              description="Gestión y validación de poderes mediante firma electrónica (OTP) vía SMS o Email."
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8 text-indigo-400" />}
              title="Reportes Automáticos"
              description="Generación inmediata de Informe de registro de asistencia con coeficientes, Listado de inasistencia con coeficientes, Resultados detallados de las votaciones, Relación de los poderes registrados."
            />
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="py-24 border-t border-white/5 bg-[#080808]">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Despídete de las asambleas <span className="text-indigo-400">caóticas e interminables</span>.
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-indigo-400">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Antes de la Asamblea</h3>
                  <p className="text-gray-400 leading-relaxed">Carga masiva de propietarios, envío automático de convocatorias y recepción anticipada de poderes digitales.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-purple-400">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Durante el Evento</h3>
                  <p className="text-gray-400 leading-relaxed">Check-in con QR en segundos, quórum proyectado en tiempo real y votaciones desde el celular con resultados instantáneos.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-pink-400">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Al Finalizar</h3>
                  <p className="text-gray-400 leading-relaxed">Generación automática de reporte de asistencia, de votación y poderes listos para descargar.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-3xl -z-10" />
            <div className="rounded-xl border border-white/10 bg-[#121212]/80 backdrop-blur-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-white/5 rounded" />
                </div>
                <div className="h-8 w-8 bg-indigo-500 rounded-full" />
              </div>
              <div className="space-y-4">
                <div className="h-24 w-full bg-white/5 rounded-lg border border-white/5" />
                <div className="h-24 w-full bg-white/5 rounded-lg border border-white/5" />
                <div className="h-24 w-full bg-white/5 rounded-lg border border-white/5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-[#0A0A0A]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Planes flexibles para cada copropiedad</h2>
            <p className="text-gray-400">Elige el plan que mejor se adapte al tamaño de tu conjunto.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              title="Básico"
              price="$800k"
              features={["Hasta 100 Unidades", "Votación Móvil", "Reporte PDF Simple"]}
            />
            <PricingCard
              title="Estándar"
              price="$1.6M"
              description="Para asambleas medianas y grandes."
              isPopular
              features={[
                "Hasta 300 unidades",
                "Votaciones ilimitadas",
                "Soporte prioritario",
                "4 asesores permanentes durante toda la asamblea"
              ]}
            />
            <PricingCard
              title="Premium"
              price="$2.5M"
              features={["Unidades Ilimitadas", "API Access", "Personalización de Marca", "Jornada Completa", "Grabación de Sesión"]}
            />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 border-t border-white/5 bg-[#080808]">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">¿Necesitas ayuda o soporte técnico?</h2>
          <p className="text-gray-400 mb-8">
            Nuestro equipo de soporte está disponible para ayudarte a configurar tu próxima asamblea o resolver cualquier duda técnica.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-black border-0 gap-2">
              <a href="https://wa.me/573216668541" target="_blank" rel="noopener noreferrer">
                <Smartphone className="w-4 h-4" /> WhatsApp Soporte
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#050505]">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-gray-200">PH Hub</span>
          </div>
          <div className="text-sm text-gray-500">
            © 2026 PH Hub. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ title, price, features, isPopular, description }: { title: string, price: string, features: string[], isPopular?: boolean, description?: string }) {
  return (
    <Card className={`bg-[#121212] border-white/5 relative ${isPopular ? "border-indigo-500 shadow-2xl shadow-indigo-500/10" : ""}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Más Popular
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl text-gray-100">{title}</CardTitle>
        <div className="text-3xl font-bold mt-2 text-white">{price} <span className="text-sm font-normal text-gray-500">/ evento</span></div>
        {description && <p className="text-sm text-gray-400 mt-2">{description}</p>}
      </CardHeader>
      <CardContent>
        <ul className="space-y-4 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>

      </CardContent>
    </Card>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="bg-[#121212] border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 group">
      <CardHeader>
        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <CardTitle className="text-xl text-gray-100">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-400 leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
