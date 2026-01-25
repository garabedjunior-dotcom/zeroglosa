import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  Upload, 
  FileText, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function NovoLote() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: operadoras } = trpc.operadoras.list.useQuery();
  const uploadMutation = trpc.lotes.uploadXML.useMutation();
  
  const [operadoraSelecionada, setOperadoraSelecionada] = useState<string>("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
      if (file.name.endsWith('.xml')) {
        setArquivo(file);
      } else {
        toast.error("Por favor, selecione um arquivo XML válido");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xml')) {
        setArquivo(file);
      } else {
        toast.error("Por favor, selecione um arquivo XML válido");
      }
    }
  };

  const handleSubmit = async () => {
    if (!operadoraSelecionada) {
      toast.error("Selecione uma operadora");
      return;
    }

    if (!arquivo) {
      toast.error("Selecione um arquivo XML");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        const base64Content = btoa(content);

        await uploadMutation.mutateAsync({
          fileName: arquivo.name,
          fileContent: base64Content,
          operadoraId: parseInt(operadoraSelecionada),
        });

        toast.success("Lote criado com sucesso!");
        setLocation("/lotes");
      };
      reader.readAsText(arquivo);
    } catch (error) {
      toast.error("Erro ao criar lote. Tente novamente.");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 sm:py-6 px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link href="/lotes">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Novo Lote XML</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">Envie um arquivo XML TISS para validação</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link href="/" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">Dashboard</Button>
              </Link>
              <Link href="/lotes" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">Lotes</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload de Arquivo TISS</CardTitle>
            <CardDescription>
              Selecione a operadora e faça upload do arquivo XML para validação automática
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seleção de Operadora */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Operadora *</label>
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

            {/* Área de Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Arquivo XML *</label>
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {arquivo ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-success" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{arquivo.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(arquivo.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Selecionar Outro Arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Arraste e solte seu arquivo XML aqui
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        ou clique no botão abaixo para selecionar
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Selecionar Arquivo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Informações */}
            <Card className="bg-muted/30 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Validações que serão realizadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Estrutura do XML conforme padrão TISS</li>
                      <li>Regras específicas da operadora selecionada</li>
                      <li>Compatibilidade entre CID e procedimentos TUSS</li>
                      <li>Documentação obrigatória e autorizações prévias</li>
                      <li>Limites de valores por procedimento</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <div className="flex gap-4 justify-end">
              <Link href="/lotes">
                <Button variant="outline">Cancelar</Button>
              </Link>
              <Button 
                onClick={handleSubmit}
                disabled={!operadoraSelecionada || !arquivo || uploadMutation.isPending}
                className="gap-2"
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Enviar Lote
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
