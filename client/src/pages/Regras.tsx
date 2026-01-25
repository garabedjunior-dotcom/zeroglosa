import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  Shield, 
  Plus,
  ArrowLeft,
  FileCheck,
  DollarSign,
  Clock,
  AlertTriangle
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function Regras() {
  const { user } = useAuth();
  const { data: operadoras } = trpc.operadoras.list.useQuery();
  const [operadoraSelecionada, setOperadoraSelecionada] = useState<string>("");
  const { data: regras, refetch } = trpc.regras.listByOperadora.useQuery(
    { operadoraId: parseInt(operadoraSelecionada) },
    { enabled: !!operadoraSelecionada }
  );
  
  const createRegraMutation = trpc.regras.create.useMutation();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaRegra, setNovaRegra] = useState({
    tipoRegra: "" as "autorizacao_previa" | "documentos_obrigatorios" | "limites_valor" | "cid_compativel" | "",
    descricao: "",
    codigoTUSS: "",
    valorMinimo: "",
    valorMaximo: "",
    prazoAutorizacao: "",
  });

  const getTipoRegraBadge = (tipo: string) => {
    const configs: Record<string, { icon: any, label: string, color: string }> = {
      autorizacao_previa: { icon: Clock, label: "Autorização Prévia", color: "bg-primary/10 text-primary border-primary/20" },
      documentos_obrigatorios: { icon: FileCheck, label: "Documentos Obrigatórios", color: "bg-accent/10 text-accent-foreground border-accent/20" },
      limites_valor: { icon: DollarSign, label: "Limites de Valor", color: "bg-success/10 text-success border-success/20" },
      cid_compativel: { icon: AlertTriangle, label: "CID Compatível", color: "bg-warning/10 text-warning border-warning/20" },
    };

    const config = configs[tipo] || configs.autorizacao_previa;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleCriarRegra = async () => {
    if (!operadoraSelecionada) {
      toast.error("Selecione uma operadora");
      return;
    }

    if (!novaRegra.tipoRegra || !novaRegra.descricao) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      await createRegraMutation.mutateAsync({
        operadoraId: parseInt(operadoraSelecionada),
        tipoRegra: novaRegra.tipoRegra,
        descricao: novaRegra.descricao,
        codigoTUSS: novaRegra.codigoTUSS || undefined,
        valorMinimo: novaRegra.valorMinimo ? parseInt(novaRegra.valorMinimo) * 100 : undefined,
        valorMaximo: novaRegra.valorMaximo ? parseInt(novaRegra.valorMaximo) * 100 : undefined,
        prazoAutorizacao: novaRegra.prazoAutorizacao ? parseInt(novaRegra.prazoAutorizacao) : undefined,
      });

      toast.success("Regra criada com sucesso!");
      setDialogOpen(false);
      setNovaRegra({
        tipoRegra: "",
        descricao: "",
        codigoTUSS: "",
        valorMinimo: "",
        valorMaximo: "",
        prazoAutorizacao: "",
      });
      refetch();
    } catch (error) {
      toast.error("Erro ao criar regra. Tente novamente.");
      console.error(error);
    }
  };

  return (
    <AppLayout>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary" />
                  Regras & Contratos
                </h1>
                <p className="text-muted-foreground mt-1">Configure regras específicas por operadora</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Seleção de Operadora */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selecione a Operadora</CardTitle>
            <CardDescription>Visualize e gerencie as regras específicas de cada operadora</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Operadora</Label>
                <Select value={operadoraSelecionada} onValueChange={setOperadoraSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma operadora" />
                  </SelectTrigger>
                  <SelectContent>
                    {operadoras?.map(op => (
                      <SelectItem key={op.id} value={op.id.toString()}>
                        {op.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!operadoraSelecionada} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Regra
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar Nova Regra</DialogTitle>
                    <DialogDescription>
                      Adicione uma regra de validação para a operadora selecionada
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tipo de Regra *</Label>
                      <Select 
                        value={novaRegra.tipoRegra} 
                        onValueChange={(value: any) => setNovaRegra({...novaRegra, tipoRegra: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="autorizacao_previa">Autorização Prévia</SelectItem>
                          <SelectItem value="documentos_obrigatorios">Documentos Obrigatórios</SelectItem>
                          <SelectItem value="limites_valor">Limites de Valor</SelectItem>
                          <SelectItem value="cid_compativel">CID Compatível</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição *</Label>
                      <Textarea
                        placeholder="Descreva a regra detalhadamente..."
                        value={novaRegra.descricao}
                        onChange={(e) => setNovaRegra({...novaRegra, descricao: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Código TUSS (opcional)</Label>
                      <Input
                        placeholder="Ex: 10101012"
                        value={novaRegra.codigoTUSS}
                        onChange={(e) => setNovaRegra({...novaRegra, codigoTUSS: e.target.value})}
                      />
                    </div>

                    {novaRegra.tipoRegra === "limites_valor" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Valor Mínimo (R$)</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={novaRegra.valorMinimo}
                            onChange={(e) => setNovaRegra({...novaRegra, valorMinimo: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor Máximo (R$)</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={novaRegra.valorMaximo}
                            onChange={(e) => setNovaRegra({...novaRegra, valorMaximo: e.target.value})}
                          />
                        </div>
                      </div>
                    )}

                    {novaRegra.tipoRegra === "autorizacao_previa" && (
                      <div className="space-y-2">
                        <Label>Prazo de Autorização (dias)</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 5"
                          value={novaRegra.prazoAutorizacao}
                          onChange={(e) => setNovaRegra({...novaRegra, prazoAutorizacao: e.target.value})}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCriarRegra} disabled={createRegraMutation.isPending}>
                      {createRegraMutation.isPending ? "Salvando..." : "Criar Regra"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Regras */}
        {operadoraSelecionada && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Regras de {operadoras?.find(op => op.id.toString() === operadoraSelecionada)?.nome}
              </h2>
              <Badge variant="secondary">{regras?.length || 0} regras ativas</Badge>
            </div>

            {regras && regras.length > 0 ? (
              <div className="grid gap-4">
                {regras.map(regra => (
                  <Card key={regra.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {getTipoRegraBadge(regra.tipoRegra)}
                            {regra.codigoTUSS && (
                              <Badge variant="outline">TUSS: {regra.codigoTUSS}</Badge>
                            )}
                          </div>
                          
                          <p className="text-foreground mb-4">{regra.descricao}</p>
                          
                          <div className="flex gap-6 text-sm text-muted-foreground">
                            {regra.valorMinimo !== null && regra.valorMaximo !== null && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                <span>
                                  R$ {(regra.valorMinimo / 100).toFixed(2)} - R$ {(regra.valorMaximo / 100).toFixed(2)}
                                </span>
                              </div>
                            )}
                            {regra.prazoAutorizacao && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{regra.prazoAutorizacao} dias</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma regra cadastrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Adicione regras para validar automaticamente os lotes desta operadora
                  </p>
                  <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeira Regra
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!operadoraSelecionada && (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Selecione uma Operadora</h3>
              <p className="text-muted-foreground">
                Escolha uma operadora acima para visualizar e gerenciar suas regras
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
    </AppLayout>
  );
}
