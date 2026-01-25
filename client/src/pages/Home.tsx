import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { 
  Shield, 
  Zap, 
  Brain, 
  FileText, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  BarChart3,
  Scan
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="border-b bg-card">
        <div className="container py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="text-xl sm:text-2xl font-bold text-foreground">ZeroGlosa</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="#features">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                  Explorar
                </Button>
              </Link>
              <a href={getLoginUrl()} className="text-xs sm:text-sm text-muted-foreground hover:text-foreground hidden sm:inline">
                Entrar
              </a>
              <a href={getLoginUrl()}>
                <Button size="sm" className="sm:size-default">Começar</Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              Evite Glosas Médicas com <span className="text-primary">Validação Inteligente</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 px-4">
              Plataforma completa que valida guias TISS antes do envio, identifica problemas automaticamente e previne glosas com inteligência artificial.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <a href={getLoginUrl()} className="w-full sm:w-auto">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  Começar Gratuitamente <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-card">
        <div className="container px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">47-68%</div>
              <div className="text-sm text-muted-foreground">Menos Glosas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">90%</div>
              <div className="text-sm text-muted-foreground">Tempo Economizado</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Guias Validadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">93%</div>
              <div className="text-sm text-muted-foreground">Menos Retrabalho</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-20">
        <div className="container px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">Funcionalidades Principais</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Validação automática antes do envio para prevenir glosas e otimizar seu faturamento
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Dashboard Executivo</CardTitle>
                <CardDescription>
                  KPIs em tempo real com redução de glosas, valor recuperado, dias para recebimento e horas poupadas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Gestão de Lotes TISS</CardTitle>
                <CardDescription>
                  Upload de XML com validação automática pré-envio, score de risco e identificação de problemas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-accent transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Scan className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Conversor OCR</CardTitle>
                <CardDescription className="text-accent-foreground">
                  <span className="font-semibold">Diferencial:</span> Digitalize faturas em papel, converta para XML TISS e valide antes do envio
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Regras por Operadora</CardTitle>
                <CardDescription>
                  Configure regras específicas de Unimed, Bradesco, Amil e outras operadoras
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>IA Copiloto</CardTitle>
                <CardDescription>
                  Identificação preventiva de riscos, sugestões de correção e geração de recursos quando necessário
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Relatórios Avançados</CardTitle>
                <CardDescription>
                  Exportação em PDF/Excel com métricas de ROI e análise de performance por operadora
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-12 sm:py-20 bg-muted/30">
        <div className="container px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">Como Funciona</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Processo simples em 3 passos para reduzir suas glosas
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload de Guias</h3>
              <p className="text-muted-foreground">
                Envie arquivos XML TISS ou digitalize faturas em papel com nosso OCR inteligente
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Validação Automática</h3>
              <p className="text-muted-foreground">
                Nossa IA analisa cada guia, identifica riscos e sugere correções antes do envio
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Envio Seguro</h3>
              <p className="text-muted-foreground">
                Envie lotes validados com confiança e acompanhe aprovações em tempo real
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-4">Pronto para Reduzir suas Glosas?</h2>
          <p className="text-xl mb-8 opacity-90">
            Junte-se a centenas de clínicas que já economizam tempo e dinheiro com ZeroGlosa
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" variant="secondary" className="gap-2">
              Começar Gratuitamente <ArrowRight className="h-5 w-5" />
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ZeroGlosa. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
