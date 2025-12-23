import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { 
  Brain, 
  Send,
  ArrowLeft,
  AlertTriangle,
  FileText,
  Sparkles,
  Copy,
  Check
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from 'streamdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function IACopiloto() {
  const { user } = useAuth();
  const { data: lotes } = trpc.lotes.list.useQuery();
  const chatMutation = trpc.ia.chat.useMutation();
  const explicarRiscoMutation = trpc.ia.explicarRisco.useMutation();
  const gerarRecursoMutation = trpc.ia.gerarRecurso.useMutation();
  
  const [mensagem, setMensagem] = useState("");
  const [mensagens, setMensagens] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente de IA especializado em gestão de glosas médicas. Como posso ajudá-lo hoje?'
    }
  ]);
  
  const [loteSelecionado, setLoteSelecionado] = useState<string>("");
  const [analiseRisco, setAnaliseRisco] = useState<string>("");
  const [motivoGlosa, setMotivoGlosa] = useState("");
  const [textoRecurso, setTextoRecurso] = useState<string>("");
  const [copiado, setCopiado] = useState(false);

  const handleEnviarMensagem = async () => {
    if (!mensagem.trim()) return;

    const novaMensagem: Message = { role: 'user', content: mensagem };
    setMensagens(prev => [...prev, novaMensagem]);
    setMensagem("");

    try {
      const response = await chatMutation.mutateAsync({
        message: mensagem,
        loteId: loteSelecionado ? parseInt(loteSelecionado) : undefined,
      });

      setMensagens(prev => [...prev, { role: 'assistant', content: response.resposta }]);
    } catch (error) {
      toast.error("Erro ao processar mensagem. Tente novamente.");
      console.error(error);
    }
  };

  const handleExplicarRisco = async () => {
    if (!loteSelecionado) {
      toast.error("Selecione um lote");
      return;
    }

    try {
      const response = await explicarRiscoMutation.mutateAsync({
        loteId: parseInt(loteSelecionado),
      });

      setAnaliseRisco(response.analise);
      toast.success("Análise de risco gerada com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar análise. Tente novamente.");
      console.error(error);
    }
  };

  const handleGerarRecurso = async () => {
    if (!loteSelecionado) {
      toast.error("Selecione um lote");
      return;
    }

    if (!motivoGlosa.trim()) {
      toast.error("Descreva o motivo da glosa");
      return;
    }

    try {
      const response = await gerarRecursoMutation.mutateAsync({
        loteId: parseInt(loteSelecionado),
        motivoGlosa,
      });

      setTextoRecurso(response.textoRecurso);
      toast.success("Recurso gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar recurso. Tente novamente.");
      console.error(error);
    }
  };

  const handleCopiarRecurso = () => {
    navigator.clipboard.writeText(textoRecurso);
    setCopiado(true);
    toast.success("Texto copiado para a área de transferência!");
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
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
                <Brain className="h-8 w-8 text-primary" />
                IA Copiloto
              </h1>
              <p className="text-muted-foreground mt-1">Assistente inteligente para prevenção de glosas e validação pré-envio</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="chat" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="risco" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Explicar Risco
            </TabsTrigger>
            <TabsTrigger value="recurso" className="gap-2">
              <FileText className="h-4 w-4" />
              Gerar Recurso
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Conversa com IA</CardTitle>
                  <CardDescription>
                    Faça perguntas sobre regras de operadoras, validação de guias e como evitar glosas antes do envio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {mensagens.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-4 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.role === 'assistant' ? (
                              <Streamdown>{msg.content}</Streamdown>
                            ) : (
                              <p className="text-sm">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {chatMutation.isPending && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-4">
                            <div className="flex gap-2">
                              <div className="animate-bounce w-2 h-2 bg-muted-foreground rounded-full"></div>
                              <div className="animate-bounce w-2 h-2 bg-muted-foreground rounded-full delay-100"></div>
                              <div className="animate-bounce w-2 h-2 bg-muted-foreground rounded-full delay-200"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua pergunta..."
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEnviarMensagem()}
                      disabled={chatMutation.isPending}
                    />
                    <Button 
                      onClick={handleEnviarMensagem}
                      disabled={!mensagem.trim() || chatMutation.isPending}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contexto</CardTitle>
                  <CardDescription>Selecione um lote para análise contextual</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={loteSelecionado} onValueChange={setLoteSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotes?.map(lote => (
                        <SelectItem key={lote.id} value={lote.id.toString()}>
                          Lote #{lote.numeroLote || lote.id} - {lote.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Explicar Risco Tab */}
          <TabsContent value="risco" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Risco</CardTitle>
                <CardDescription>
                  Identifique riscos de glosa ANTES do envio e receba sugestões de correção
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecione o Lote</label>
                  <Select value={loteSelecionado} onValueChange={setLoteSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um lote para análise" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotes?.map(lote => (
                        <SelectItem key={lote.id} value={lote.id.toString()}>
                          Lote #{lote.numeroLote || lote.id} - Score: {lote.scoreRisco}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleExplicarRisco}
                  disabled={!loteSelecionado || explicarRiscoMutation.isPending}
                  className="w-full gap-2"
                >
                  {explicarRiscoMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                      Analisando...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Explicar Risco
                    </>
                  )}
                </Button>

                {analiseRisco && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <Streamdown>{analiseRisco}</Streamdown>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gerar Recurso Tab */}
          <TabsContent value="recurso" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gerador de Recursos</CardTitle>
                <CardDescription>
                  Gere recursos para contestação quando uma glosa já ocorreu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecione o Lote</label>
                  <Select value={loteSelecionado} onValueChange={setLoteSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o lote glosado" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotes?.filter(l => l.status === 'glosa').map(lote => (
                        <SelectItem key={lote.id} value={lote.id.toString()}>
                          Lote #{lote.numeroLote || lote.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Motivo da Glosa</label>
                  <Input
                    placeholder="Ex: Falta de autorização prévia"
                    value={motivoGlosa}
                    onChange={(e) => setMotivoGlosa(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleGerarRecurso}
                  disabled={!loteSelecionado || !motivoGlosa.trim() || gerarRecursoMutation.isPending}
                  className="w-full gap-2"
                >
                  {gerarRecursoMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Gerar Recurso
                    </>
                  )}
                </Button>

                {textoRecurso && (
                  <Card className="bg-muted/30">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Texto do Recurso</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopiarRecurso}
                          className="gap-2"
                        >
                          {copiado ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Streamdown>{textoRecurso}</Streamdown>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
