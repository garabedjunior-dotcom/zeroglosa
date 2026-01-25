import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  FileText,
  Upload
} from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery();
  const { data: lotes } = trpc.lotes.list.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Dados para gráfico de glosas por status
  const statusData = [
    { name: 'Pronto', value: lotes?.filter(l => l.status === 'pronto').length || 0, color: 'oklch(0.55 0.15 145)' },
    { name: 'Revisar', value: lotes?.filter(l => l.status === 'revisar').length || 0, color: 'oklch(0.70 0.15 50)' },
    { name: 'Crítico', value: lotes?.filter(l => l.status === 'critico').length || 0, color: 'oklch(0.577 0.245 27.325)' },
    { name: 'Enviado', value: lotes?.filter(l => l.status === 'enviado').length || 0, color: 'oklch(0.62 0.18 250)' },
    { name: 'Aprovado', value: lotes?.filter(l => l.status === 'aprovado').length || 0, color: 'oklch(0.55 0.15 145)' },
    { name: 'Glosa', value: lotes?.filter(l => l.status === 'glosa').length || 0, color: 'oklch(0.577 0.245 27.325)' },
  ];

  // Dados para gráfico de origem dos lotes
  const origemData = [
    { name: 'XML', value: lotes?.filter(l => l.origem === 'xml').length || 0 },
    { name: 'OCR', value: lotes?.filter(l => l.origem === 'ocr').length || 0 },
  ];

  const COLORS = ['oklch(0.62 0.18 250)', 'oklch(0.70 0.15 50)'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 sm:py-6 px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">ZeroGlosa</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Gestão Inteligente de Glosas Médicas</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline">Olá, {user?.name || 'Usuário'}</span>
              <Link href="/lotes" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <FileText className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Lotes</span>
                </Button>
              </Link>
              <Link href="/regras" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">Regras</Button>
              </Link>
              <Link href="/ia" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full sm:w-auto hidden sm:inline-flex">IA Copiloto</Button>
              </Link>
              <Link href="/ajuda" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">Ajuda</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 sm:py-8 px-4">
        {/* KPIs */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Redução de Glosas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{kpis?.taxaAprovacao || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">Taxa de aprovação</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor Protegido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                R$ {((kpis?.valorRecuperado || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Evitado antes do envio</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: 'oklch(0.62 0.18 250)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Dias para Recebimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">25</div>
              <p className="text-xs text-muted-foreground mt-1">Média estimada</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: 'oklch(0.55 0.15 145)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Horas Poupadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{(kpis?.totalLotes || 0) * 2}h</div>
              <p className="text-xs text-muted-foreground mt-1">Com validação automática</p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Converta suas faturas, use o pré-envio e confirme as informações do arquivo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              <Link href="/lotes/novo">
                <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                  <Upload className="h-8 w-8" />
                  <span className="font-semibold">Novo Lote XML</span>
                </Button>
              </Link>
              <Link href="/ocr">
                <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                  <FileText className="h-8 w-8" />
                  <span className="font-semibold">Converter Fatura (OCR)</span>
                </Button>
              </Link>
              <Link href="/lotes">
                <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                  <CheckCircle2 className="h-8 w-8" />
                  <span className="font-semibold">Pré-Envio</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 mb-6 sm:mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Status dos Lotes</CardTitle>
              <CardDescription>Distribuição por status atual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={250} minWidth={300}>
                  <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="oklch(0.62 0.18 250)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Origem dos Lotes</CardTitle>
              <CardDescription>XML vs OCR</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto flex justify-center">
                <ResponsiveContainer width="100%" height={250} minWidth={300}>
                  <PieChart>
                  <Pie
                    data={origemData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {origemData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        {lotes && lotes.filter(l => l.status === 'critico').length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Lotes Críticos
              </CardTitle>
              <CardDescription>Requerem atenção imediata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lotes.filter(l => l.status === 'critico').slice(0, 3).map(lote => (
                  <div key={lote.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Lote #{lote.numeroLote || lote.id}</p>
                      <p className="text-sm text-muted-foreground">Score de Risco: {lote.scoreRisco}%</p>
                    </div>
                    <Link href={`/lotes/${lote.id}`}>
                      <Button size="sm" variant="destructive">Revisar</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
