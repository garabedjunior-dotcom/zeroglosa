import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  Upload, 
  Scan, 
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  Edit,
  Save
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface ExtractedData {
  nomePaciente: string;
  cpfPaciente: string;
  numeroCarteirinha: string;
  codigoTUSS: string;
  cid: string;
  valorProcedimento: number;
  nomeMedico: string;
  crm: string;
}

export default function OCR() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: operadoras } = trpc.operadoras.list.useQuery();
  const ocrMutation = trpc.ocr.processImage.useMutation();
  const createLoteMutation = trpc.lotes.create.useMutation();
  const createGuiaMutation = trpc.guias.create.useMutation();
  
  const [operadoraSelecionada, setOperadoraSelecionada] = useState<string>("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState<ExtractedData | null>(null);
  const [editando, setEditando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processarImagem(file);
      } else {
        toast.error("Por favor, selecione uma imagem válida (JPG, PNG, PDF)");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        processarImagem(file);
      } else {
        toast.error("Por favor, selecione uma imagem válida (JPG, PNG, PDF)");
      }
    }
  };

  const processarImagem = (file: File) => {
    setImagem(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagemPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessarOCR = async () => {
    if (!imagem) {
      toast.error("Selecione uma imagem");
      return;
    }

    setProcessando(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        const base64Content = content.split(',')[1]; // Remove o prefixo data:image/...

        const result = await ocrMutation.mutateAsync({
          imageData: base64Content,
          fileName: imagem.name,
        });

        setDadosExtraidos(result.extractedData as ExtractedData);
        setEditando(true);
        toast.success("Dados extraídos com sucesso! Revise e corrija se necessário.");
      };
      reader.readAsDataURL(imagem);
    } catch (error) {
      toast.error("Erro ao processar imagem. Tente novamente.");
      console.error(error);
    } finally {
      setProcessando(false);
    }
  };

  const handleSalvarLote = async () => {
    if (!operadoraSelecionada) {
      toast.error("Selecione uma operadora");
      return;
    }

    if (!dadosExtraidos) {
      toast.error("Nenhum dado extraído para salvar");
      return;
    }

    try {
      // Criar lote
      await createLoteMutation.mutateAsync({
        operadoraId: parseInt(operadoraSelecionada),
        origem: 'ocr',
        valorTotal: dadosExtraidos.valorProcedimento,
        quantidadeGuias: 1,
      });

      toast.success("Lote criado com sucesso a partir do OCR!");
      setLocation("/lotes");
    } catch (error) {
      toast.error("Erro ao criar lote. Tente novamente.");
      console.error(error);
    }
  };

  return (
    <AppLayout>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Scan className="h-8 w-8 text-accent" />
                Conversor de Faturas (OCR)
              </h1>
              <p className="text-muted-foreground mt-1">Digitalize faturas em papel, converta para XML TISS e valide antes do envio</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Upload e Preview */}
          <Card>
            <CardHeader>
              <CardTitle>1. Upload da Fatura</CardTitle>
              <CardDescription>
                Tire uma foto ou escaneie a fatura manual para conversão e validação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!imagemPreview ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging 
                      ? 'border-accent bg-accent/5' 
                      : 'border-border hover:border-accent/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-accent" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Arraste e solte sua fatura aqui
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Formatos aceitos: JPG, PNG, PDF
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Selecionar Imagem
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border bg-muted">
                    {imagemPreview ? (
                      <img 
                        src={imagemPreview} 
                        alt="Preview da fatura" 
                        className="w-full h-auto max-h-64 sm:max-h-96 object-contain"
                        onError={(e) => {
                          console.error('Erro ao carregar imagem:', e);
                          toast.error('Erro ao carregar preview da imagem');
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-96 text-muted-foreground">
                        <p>Carregando preview...</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setImagem(null);
                        setImagemPreview("");
                        setDadosExtraidos(null);
                        setEditando(false);
                      }}
                      className="flex-1 w-full"
                    >
                      Trocar Imagem
                    </Button>
                    <Button
                      onClick={handleProcessarOCR}
                      disabled={processando || !!dadosExtraidos}
                      className="flex-1 w-full gap-2"
                    >
                      {processando ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                          Processando...
                        </>
                      ) : dadosExtraidos ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Processado
                        </>
                      ) : (
                        <>
                          <Scan className="h-4 w-4" />
                          Processar OCR
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados Extraídos */}
          <Card>
            <CardHeader>
              <CardTitle>2. Dados Extraídos</CardTitle>
              <CardDescription>
                Revise os campos antes de criar o lote para validação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!dadosExtraidos ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aguardando processamento da imagem...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Paciente</Label>
                      <Input
                        value={dadosExtraidos.nomePaciente}
                        onChange={(e) => setDadosExtraidos({...dadosExtraidos, nomePaciente: e.target.value})}
                        disabled={!editando}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>CPF</Label>
                        <Input
                          value={dadosExtraidos.cpfPaciente}
                          onChange={(e) => setDadosExtraidos({...dadosExtraidos, cpfPaciente: e.target.value})}
                          disabled={!editando}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Carteirinha</Label>
                        <Input
                          value={dadosExtraidos.numeroCarteirinha}
                          onChange={(e) => setDadosExtraidos({...dadosExtraidos, numeroCarteirinha: e.target.value})}
                          disabled={!editando}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Código TUSS</Label>
                        <Input
                          value={dadosExtraidos.codigoTUSS}
                          onChange={(e) => setDadosExtraidos({...dadosExtraidos, codigoTUSS: e.target.value})}
                          disabled={!editando}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CID</Label>
                        <Input
                          value={dadosExtraidos.cid}
                          onChange={(e) => setDadosExtraidos({...dadosExtraidos, cid: e.target.value})}
                          disabled={!editando}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Valor do Procedimento (R$)</Label>
                      <Input
                        type="number"
                        value={dadosExtraidos.valorProcedimento / 100}
                        onChange={(e) => setDadosExtraidos({...dadosExtraidos, valorProcedimento: parseFloat(e.target.value) * 100})}
                        disabled={!editando}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome do Médico</Label>
                        <Input
                          value={dadosExtraidos.nomeMedico}
                          onChange={(e) => setDadosExtraidos({...dadosExtraidos, nomeMedico: e.target.value})}
                          disabled={!editando}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CRM</Label>
                        <Input
                          value={dadosExtraidos.crm}
                          onChange={(e) => setDadosExtraidos({...dadosExtraidos, crm: e.target.value})}
                          disabled={!editando}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Operadora *</Label>
                      <Select value={operadoraSelecionada} onValueChange={setOperadoraSelecionada}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a operadora" />
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
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setEditando(!editando)}
                      className="flex-1 gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      {editando ? "Bloquear Edição" : "Editar Campos"}
                    </Button>
                    <Button
                      onClick={handleSalvarLote}
                      disabled={!operadoraSelecionada || createLoteMutation.isPending}
                      className="flex-1 gap-2"
                    >
                      {createLoteMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Criar Lote
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Informações sobre OCR */}
        <Card className="mt-6 bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">Após a conversão, o sistema irá:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Converter a fatura para XML TISS padrão ANS</li>
                  <li>Aplicar regras específicas da operadora selecionada</li>
                  <li>Validar compatibilidade entre CID e procedimento TUSS</li>
                  <li>Verificar limites de valores e documentação obrigatória</li>
                  <li>Gerar score de risco para identificação de problemas</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  <strong>Importante:</strong> Corrija qualquer problema identificado ANTES de enviar à operadora para evitar glosas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
    </AppLayout>
  );
}
