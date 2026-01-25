import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Send,
  Download,
  Eye,
  Edit2,
  Save
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useState, useEffect } from "react";

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

  const { data: guias = [], refetch: refetchGuias } = trpc.guias.listByLote.useQuery(
    { loteId },
    { enabled: loteId > 0 }
  );

  const updateGuiaMutation = trpc.guias.update.useMutation({
    onSuccess: () => {
      refetchGuias();
      setEditingGuiaId(null);
      toast.success('Dados atualizados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar dados: ' + error.message);
    },
  });

  const [editingGuiaId, setEditingGuiaId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  const handleEditGuia = (guia: any) => {
    setEditingGuiaId(guia.id);
    setEditFormData({
      cpfPaciente: guia.cpfPaciente || '',
      nomePaciente: guia.nomePaciente || '',
      numeroCarteirinha: guia.numeroCarteirinha || '',
      codigoTUSS: guia.codigoTUSS || '',
      cid: guia.cid || '',
      valorProcedimento: guia.valorProcedimento || 0,
      nomeMedico: guia.nomeMedico || '',
      crm: guia.crm || '',
    });
  };

  const handleSaveGuia = async (guiaId: number) => {
    await updateGuiaMutation.mutateAsync({
      id: guiaId,
      ...editFormData,
    });
  };

  const handleCancelEdit = () => {
    setEditingGuiaId(null);
    setEditFormData({});
  };

  // Validações em tempo real
  const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleaned)) return false;
    
    // Valida dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleaned.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleaned.charAt(10))) return false;
    
    return true;
  };

  const validateTUSS = (tuss: string): boolean => {
    const cleaned = tuss.replace(/\D/g, '');
    return cleaned.length === 8;
  };

  const validateCID = (cid: string): boolean => {
    // Formato: A00.0 ou A00
    return /^[A-Z]\d{2}(\.\d)?$/.test(cid.toUpperCase());
  };

  const getFieldError = (field: string, value: string): string | null => {
    switch (field) {
      case 'cpfPaciente':
        if (!value) return null;
        return validateCPF(value) ? null : 'CPF inválido';
      case 'codigoTUSS':
        if (!value) return null;
        return validateTUSS(value) ? null : 'TUSS deve ter 8 dígitos';
      case 'cid':
        if (!value) return null;
        return validateCID(value) ? null : 'CID inválido (ex: A00.0)';
      default:
        return null;
    }
  };

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
        <div className="container py-4 sm:py-6 px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link href="/lotes">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Lote #{lote.numeroLote || lote.id}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {operadora?.nome || 'Operadora não identificada'} • {lote.createdAt?.toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Badge className={statusColor}>
                {lote.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 sm:py-8 px-4">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="editar">Editar Dados</TabsTrigger>
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

              {/* Tab Editar Dados */}
              <TabsContent value="editar" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Editar Dados das Guias</CardTitle>
                    <CardDescription>
                      Clique em "Editar" para corrigir informações das guias antes do envio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {guias.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhuma guia encontrada neste lote.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {guias.map((guia) => (
                          <Card key={guia.id} className="border-2">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Guia #{guia.id}</CardTitle>
                                {editingGuiaId === guia.id ? (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveGuia(guia.id)}
                                      disabled={updateGuiaMutation.isPending}
                                    >
                                      <Save className="h-4 w-4 mr-1" />
                                      Salvar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                      disabled={updateGuiaMutation.isPending}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditGuia(guia)}
                                  >
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">CPF do Paciente</label>
                                  {editingGuiaId === guia.id ? (
                                    <div>
                                      <Input
                                        value={editFormData.cpfPaciente}
                                        onChange={(e) => setEditFormData({ ...editFormData, cpfPaciente: e.target.value })}
                                        placeholder="000.000.000-00"
                                        className={`mt-1 ${getFieldError('cpfPaciente', editFormData.cpfPaciente) ? 'border-red-500' : ''}`}
                                      />
                                      {getFieldError('cpfPaciente', editFormData.cpfPaciente) && (
                                        <p className="text-xs text-red-500 mt-1">{getFieldError('cpfPaciente', editFormData.cpfPaciente)}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm mt-1">{guia.cpfPaciente || 'N/A'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Nome do Paciente</label>
                                  {editingGuiaId === guia.id ? (
                                    <Input
                                      value={editFormData.nomePaciente}
                                      onChange={(e) => setEditFormData({ ...editFormData, nomePaciente: e.target.value })}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm mt-1">{guia.nomePaciente || 'N/A'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Carteirinha</label>
                                  {editingGuiaId === guia.id ? (
                                    <Input
                                      value={editFormData.numeroCarteirinha}
                                      onChange={(e) => setEditFormData({ ...editFormData, numeroCarteirinha: e.target.value })}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm mt-1">{guia.numeroCarteirinha || 'N/A'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Código TUSS</label>
                                  {editingGuiaId === guia.id ? (
                                    <div>
                                      <Input
                                        value={editFormData.codigoTUSS}
                                        onChange={(e) => setEditFormData({ ...editFormData, codigoTUSS: e.target.value })}
                                        placeholder="8 dígitos"
                                        className={`mt-1 ${getFieldError('codigoTUSS', editFormData.codigoTUSS) ? 'border-red-500' : ''}`}
                                      />
                                      {getFieldError('codigoTUSS', editFormData.codigoTUSS) && (
                                        <p className="text-xs text-red-500 mt-1">{getFieldError('codigoTUSS', editFormData.codigoTUSS)}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm mt-1">{guia.codigoTUSS || 'N/A'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">CID</label>
                                  {editingGuiaId === guia.id ? (
                                    <div>
                                      <Input
                                        value={editFormData.cid}
                                        onChange={(e) => setEditFormData({ ...editFormData, cid: e.target.value })}
                                        placeholder="Ex: A00.0"
                                        className={`mt-1 ${getFieldError('cid', editFormData.cid) ? 'border-red-500' : ''}`}
                                      />
                                      {getFieldError('cid', editFormData.cid) && (
                                        <p className="text-xs text-red-500 mt-1">{getFieldError('cid', editFormData.cid)}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm mt-1">{guia.cid || 'N/A'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Valor do Procedimento</label>
                                  {editingGuiaId === guia.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editFormData.valorProcedimento / 100}
                                      onChange={(e) => setEditFormData({ ...editFormData, valorProcedimento: Math.round(parseFloat(e.target.value) * 100) })}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm mt-1">R$ {((guia.valorProcedimento || 0) / 100).toFixed(2)}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Nome do Médico</label>
                                  {editingGuiaId === guia.id ? (
                                    <Input
                                      value={editFormData.nomeMedico}
                                      onChange={(e) => setEditFormData({ ...editFormData, nomeMedico: e.target.value })}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm mt-1">{guia.nomeMedico || 'N/A'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">CRM</label>
                                  {editingGuiaId === guia.id ? (
                                    <Input
                                      value={editFormData.crm}
                                      onChange={(e) => setEditFormData({ ...editFormData, crm: e.target.value })}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm mt-1">{guia.crm || 'N/A'}</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
