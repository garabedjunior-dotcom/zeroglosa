import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  Upload, 
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Lotes() {
  const { user } = useAuth();
  const { data: lotes, isLoading } = trpc.lotes.list.useQuery();
  const { data: operadoras } = trpc.operadoras.list.useQuery();
  
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando lotes...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      pronto: { variant: "default", icon: CheckCircle2, label: "Pronto" },
      revisar: { variant: "secondary", icon: Clock, label: "Revisar" },
      critico: { variant: "destructive", icon: AlertCircle, label: "Crítico" },
      enviado: { variant: "outline", icon: Upload, label: "Enviado" },
      aprovado: { variant: "default", icon: CheckCircle2, label: "Aprovado" },
      glosa: { variant: "destructive", icon: XCircle, label: "Glosa" },
    };

    const config = variants[status] || variants.revisar;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getOrigemBadge = (origem: string) => {
    return origem === "ocr" ? (
      <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent">
        OCR
      </Badge>
    ) : (
      <Badge variant="outline">XML</Badge>
    );
  };

  // Filtrar lotes
  const lotesFiltrados = lotes?.filter(lote => {
    const matchStatus = filtroStatus === "todos" || lote.status === filtroStatus;
    const matchOperadora = filtroOperadora === "todas" || lote.operadoraId.toString() === filtroOperadora;
    const matchBusca = !busca || 
      lote.numeroLote?.toLowerCase().includes(busca.toLowerCase()) ||
      lote.id.toString().includes(busca);
    
    return matchStatus && matchOperadora && matchBusca;
  });

  return (
    <AppLayout>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 sm:py-6 px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Lotes & Glosas</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie seus lotes de guias TISS</p>
              </div>
            </div>
            <Link href="/lotes/novo">
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Novo Lote
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 sm:py-8 px-4">
        {/* Filtros */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Número do lote ou ID..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="pronto">Pronto</SelectItem>
                    <SelectItem value="revisar">Revisar</SelectItem>
                    <SelectItem value="critico">Crítico</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="glosa">Glosa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Operadora</label>
                <Select value={filtroOperadora} onValueChange={setFiltroOperadora}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as operadoras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as operadoras</SelectItem>
                    {operadoras?.map(op => (
                      <SelectItem key={op.id} value={op.id.toString()}>
                        {op.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Lotes */}
        <div className="space-y-4">
          {lotesFiltrados && lotesFiltrados.length > 0 ? (
            lotesFiltrados.map(lote => {
              const operadora = operadoras?.find(op => op.id === lote.operadoraId);
              
              return (
                <Card key={lote.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-base sm:text-lg font-semibold">
                            Lote #{lote.numeroLote || lote.id}
                          </h3>
                          {getStatusBadge(lote.status)}
                          {getOrigemBadge(lote.origem)}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Operadora</p>
                            <p className="font-medium">{operadora?.nome || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Valor Total</p>
                            <p className="font-medium">
                              R$ {((lote.valorTotal || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Guias</p>
                            <p className="font-medium">{lote.quantidadeGuias || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Score de Risco</p>
                            <p className={`font-medium ${
                              (lote.scoreRisco || 0) > 70 ? 'text-destructive' : 
                              (lote.scoreRisco || 0) > 40 ? 'text-warning' : 
                              'text-success'
                            }`}>
                              {lote.scoreRisco || 0}%
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground">
                            Criado em {new Date(lote.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link href={`/lote/${lote.id}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Ver Detalhes
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum lote encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {lotes && lotes.length > 0 
                    ? "Tente ajustar os filtros de busca" 
                    : "Comece enviando seu primeiro lote de guias TISS"}
                </p>
                <Link href="/lotes/novo">
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Criar Novo Lote
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
    </AppLayout>
  );
}
