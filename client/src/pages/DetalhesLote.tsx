import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Send,
  Download,
  Eye
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  critico: boolean;
}

export default function DetalhesLote() {
  const { user } = useAuth();
  const params = useParams();
  const loteId = params.id ? parseInt(params.id) : 0;
  
  const { data: lote, isLoading } = trpc.lotes.list.useQuery(undefined, {
    select: (lotes) => lotes.find(l => l.id === loteId)
  });
  
  const { data: operadora } = trpc.operadoras.list.useQuery(undefined, {
    select: (ops) => ops.find(o => o.id === lote?.operadoraId),
    enabled: !!lote
  });

  const { data: regras } = trpc.regras.listByOperadora.useQuery(
    { operadoraId: lote?.operadoraId || 0 },
    { enabled: !!lote }
  );

  const { data: validacoes } = trpc.validacoes.getByLoteId.useQuery(
    { loteId },
    { enabled: loteId > 0 }
  );

  // Gerar checklist baseado nas validações do banco
  const checklistFromValidacoes = (): ChecklistItem[] => {
    if (!validacoes || validacoes.length === 0) {
      // Checklist padrão se não houver validações
      return [
        { id: '1', label: 'Todos os campos obrigatórios preenchidos', checked: false, critico: true },
        { id: '2', label: 'CPF do paciente válido', checked: false, critico: true },
        { id: '3', label: 'Código TUSS correto e atualizado', checked: false, critico: true },
        { id: '4', label: 'CID compatível com procedimento', checked: false, critico: true },
        { id: '5', label: 'Autorização prévia anexada (se necessário)', checked: false, critico: true },
        { id: '6', label: 'Valor dentro dos limites da operadora', checked: false, critico: false },
        { id: '7', label: 'Data do procedimento válida', checked: false, critico: false },
        { id: '8', label: 'CRM do médico executante informado', checked: false, critico: false },
      ];
    }

    // Mapear validações para checklist
    const items: ChecklistItem[] = [];
    let idCounter = 1;

    // Agrupar validações por tipo
    const validacoesPorTipo = validacoes.reduce((acc, v) => {
      const key = v.campo || v.tipoValidacao;
      if (!acc[key]) acc[key] = [];
      acc[key].push(v);
      return acc;
    }, {} as Record<string, typeof validacoes>);

    // Criar item de checklist para cada grupo
    Object.entries(validacoesPorTipo).forEach(([key, vals]) => {
      const temErro = vals.some(v => v.status === 'erro');
      const critico = vals.some(v => v.critico === 1);
      const aprovado = vals.every(v => v.status === 'aprovado');

      items.push({
        id: String(idCounter++),
        label: vals[0]?.mensagem || key,
        checked: aprovado,
        critico,
      });
    });

    return items;
  };

  const [checklist, setChecklist] = useState<ChecklistItem[]>(checklistFromValidacoes());

  // Atualizar checklist quando validações mudarem
  useEffect(() => {
    if (validacoes) {
      setChecklist(checklistFromValidacoes());
    }
  }, [validacoes]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const checklistCompleto = checklist.every(item => item.checked);
  const checklistCriticoCompleto = checklist.filter(item => item.critico).every(item => item.checked);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Lote não encontrado</CardTitle>
            <CardDescription>O lote solicitado não existe ou você não tem permissão para visualizá-lo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/lotes">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar para Lotes
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreRisco = lote.scoreRisco ?? 0;
  const statusColor = 
    lote.status === 'pronto' ? 'bg-green-500' :
    lote.status === 'revisar' ? 'bg-yellow-500' :
    lote.status === 'critico' ? 'bg-red-500' :
    lote.status === 'enviado' ? 'bg-blue-500' :
    lote.status === 'aprovado' ? 'bg-green-600' :
    'bg-gray-500';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/lotes">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Lote #{lote.numeroLote || lote.id}</h1>
                <p className="text-muted-foreground">
                  {operadora?.nome || 'Operadora não identificada'} • Criado em {lote.createdAt?.toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusColor}>
                {lote.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score de Risco */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {scoreRisco > 70 ? (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  ) : scoreRisco > 40 ? (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  Score de Risco: {scoreRisco}%
                </CardTitle>
                <CardDescription>
                  {scoreRisco > 70 
                    ? 'ALTO RISCO - Correção urgente necessária antes do envio' 
                    : scoreRisco > 40 
                    ? 'Risco Médio - Revisar antes do envio'
                    : 'Baixo Risco - Lote pronto para envio'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={scoreRisco} className="h-3" />
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="resumo" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="checklist">Checklist Pré-Envio</TabsTrigger>
                <TabsTrigger value="regras">Regras Aplicadas</TabsTrigger>
              </TabsList>

              {/* Tab Resumo */}
              <TabsContent value="resumo" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Lote</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Operadora</p>
                        <p className="font-medium">{operadora?.nome || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Código da Operadora</p>
                        <p className="font-medium">{operadora?.codigo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Total</p>
                        <p className="font-medium text-lg">
                          R$ {((lote.valorTotal || 0) / 100).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quantidade de Guias</p>
                        <p className="font-medium">{lote.quantidadeGuias}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Origem</p>
                        <p className="font-medium">
                          {lote.origem === 'ocr' ? 'Convertido via OCR' : 'Upload XML TISS'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className={statusColor}>
                          {lote.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {lote.observacoes && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Observações</p>
                          <p className="text-sm">{lote.observacoes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {scoreRisco > 40 && (
                  <Alert variant={scoreRisco > 70 ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção!</AlertTitle>
                    <AlertDescription>
                      Este lote apresenta riscos de glosa. Revise o checklist de pré-envio e corrija os problemas identificados antes de enviar à operadora.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Tab Checklist */}
              <TabsContent value="checklist" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Checklist de Pré-Envio</CardTitle>
                    <CardDescription>
                      Valide todos os itens antes de enviar o lote à operadora
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {checklist.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={item.id}
                            checked={item.checked}
                            onCheckedChange={() => toggleChecklistItem(item.id)}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={item.id}
                            className="flex-1 text-sm cursor-pointer"
                          >
                            <span className={item.checked ? 'line-through text-muted-foreground' : ''}>
                              {item.label}
                            </span>
                            {item.critico && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Crítico
                              </Badge>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso do Checklist</span>
                        <span className="font-medium">
                          {checklist.filter(i => i.checked).length} / {checklist.length}
                        </span>
                      </div>
                      <Progress 
                        value={(checklist.filter(i => i.checked).length / checklist.length) * 100} 
                        className="h-2"
                      />
                    </div>

                    {!checklistCriticoCompleto && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Itens Críticos Pendentes</AlertTitle>
                        <AlertDescription>
                          Complete todos os itens críticos antes de enviar o lote.
                        </AlertDescription>
                      </Alert>
                    )}

                    {checklistCompleto && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Checklist Completo!</AlertTitle>
                        <AlertDescription>
                          Todos os itens foram validados. O lote está pronto para envio.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Regras */}
              <TabsContent value="regras" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Regras da Operadora</CardTitle>
                    <CardDescription>
                      Regras específicas de {operadora?.nome} aplicadas a este lote
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {regras && regras.length > 0 ? (
                      <div className="space-y-3">
                        {regras.map((regra) => (
                          <div key={regra.id} className="p-4 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">
                                {regra.tipoRegra.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                              {regra.codigoTUSS && (
                                <span className="text-xs text-muted-foreground">
                                  TUSS: {regra.codigoTUSS}
                                </span>
                              )}
                            </div>
                            <p className="text-sm">{regra.descricao}</p>
                            {(regra.valorMinimo || regra.valorMaximo) && (
                              <p className="text-xs text-muted-foreground">
                                Limite de valor: R$ {((regra.valorMinimo || 0) / 100).toFixed(2)} - R$ {((regra.valorMaximo || 999999) / 100).toFixed(2)}
                              </p>
                            )}
                            {regra.prazoAutorizacao && (
                              <p className="text-xs text-muted-foreground">
                                Prazo de autorização: {regra.prazoAutorizacao} dias
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhuma regra específica cadastrada para esta operadora
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar de Ações */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full gap-2"
                  disabled={!checklistCriticoCompleto || lote.status === 'enviado' || lote.status === 'aprovado'}
                  onClick={() => toast.success('Funcionalidade de envio será implementada em breve')}
                >
                  <Send className="h-4 w-4" />
                  Enviar à Operadora
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Baixar XML
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <FileText className="h-4 w-4" />
                  Gerar Relatório
                </Button>
                <Separator />
                <Link href={`/ia-copiloto?lote=${lote.id}`}>
                  <Button variant="secondary" className="w-full gap-2">
                    <Eye className="h-4 w-4" />
                    Analisar com IA
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                      <div className="flex-1 w-px bg-border"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">Lote criado</p>
                      <p className="text-xs text-muted-foreground">
                        {lote.createdAt?.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  {lote.updatedAt && lote.updatedAt.getTime() !== lote.createdAt?.getTime() && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Última atualização</p>
                        <p className="text-xs text-muted-foreground">
                          {lote.updatedAt?.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
