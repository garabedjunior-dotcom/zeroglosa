import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  HelpCircle, 
  Search,
  ArrowLeft,
  BookOpen,
  Video,
  FileText,
  MessageCircle
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Ajuda() {
  const [busca, setBusca] = useState("");

  const tutoriais = [
    {
      categoria: "Primeiros Passos",
      icon: BookOpen,
      items: [
        {
          titulo: "Como criar meu primeiro lote",
          conteudo: "Para criar um novo lote, acesse o Dashboard e clique em 'Novo Lote XML'. Selecione a operadora e faça upload do arquivo XML TISS. O sistema validará automaticamente e exibirá o score de risco."
        },
        {
          titulo: "Entendendo o Dashboard",
          conteudo: "O Dashboard apresenta 4 KPIs principais: Redução de Glosas (taxa de aprovação), Valor Recuperado (economia total), Dias para Recebimento (média estimada) e Horas Poupadas (tempo economizado). Use os gráficos para visualizar a distribuição de lotes por status e origem."
        },
        {
          titulo: "Configurando operadoras",
          conteudo: "Acesse 'Regras & Contratos' no menu. Selecione uma operadora e clique em 'Nova Regra' para adicionar validações específicas como autorização prévia, documentos obrigatórios, limites de valor ou CID compatível."
        }
      ]
    },
    {
      categoria: "Conversor OCR",
      icon: FileText,
      items: [
        {
          titulo: "Como usar o OCR para digitalizar faturas",
          conteudo: "Acesse 'Converter Fatura (OCR)' no menu. Tire uma foto ou escaneie a fatura em papel. Arraste a imagem para a área de upload ou clique para selecionar. Após processar, revise os campos extraídos e corrija se necessário antes de criar o lote."
        },
        {
          titulo: "Melhores práticas para fotos de faturas",
          conteudo: "Para melhor precisão do OCR: use boa iluminação, evite sombras, mantenha a câmera paralela ao documento, certifique-se de que todo o texto está legível e use resolução adequada (mínimo 300 DPI para escaneamento)."
        },
        {
          titulo: "Campos extraídos automaticamente",
          conteudo: "O OCR extrai: nome e CPF do paciente, número da carteirinha, código TUSS, CID, valor do procedimento, nome e CRM do médico. Sempre revise os dados antes de criar o lote para garantir precisão."
        }
      ]
    },
    {
      categoria: "IA Copiloto",
      icon: MessageCircle,
      items: [
        {
          titulo: "Como usar o Chat com IA",
          conteudo: "Acesse 'IA Copiloto' e selecione a aba 'Chat'. Digite suas perguntas sobre regras de operadoras, validação de guias ou redução de glosas. Você pode selecionar um lote específico para análise contextual."
        },
        {
          titulo: "Explicar Risco de um lote",
          conteudo: "Na aba 'Explicar Risco', selecione um lote e clique em 'Explicar Risco'. A IA analisará o score de risco, status, valor e quantidade de guias, fornecendo uma análise detalhada dos riscos e sugestões de correção."
        },
        {
          titulo: "Gerar texto de recurso de glosa",
          conteudo: "Na aba 'Gerar Recurso', selecione um lote glosado, descreva o motivo da glosa e clique em 'Gerar Recurso'. A IA criará um texto profissional e técnico para contestação, citando normas da ANS quando aplicável."
        }
      ]
    },
    {
      categoria: "Gestão de Lotes",
      icon: FileText,
      items: [
        {
          titulo: "Entendendo os status dos lotes",
          conteudo: "Pronto: lote validado e pronto para envio. Revisar: requer revisão manual. Crítico: problemas graves que impedem envio. Enviado: lote enviado à operadora. Aprovado: lote aprovado pela operadora. Glosa: lote glosado, requer recurso."
        },
        {
          titulo: "Score de Risco",
          conteudo: "O score de risco (0-100%) indica a probabilidade de glosa. 0-40%: baixo risco (verde). 41-70%: risco médio (amarelo). 71-100%: alto risco (vermelho). Revise lotes com score alto antes de enviar."
        },
        {
          titulo: "Filtros e busca de lotes",
          conteudo: "Use os filtros por status, operadora e período para encontrar lotes específicos. A busca permite localizar por número do lote ou ID. Combine filtros para análises mais precisas."
        }
      ]
    },
    {
      categoria: "Regras e Validações",
      icon: BookOpen,
      items: [
        {
          titulo: "Tipos de regras disponíveis",
          conteudo: "Autorização Prévia: procedimentos que exigem autorização antes do atendimento. Documentos Obrigatórios: anexos necessários para aprovação. Limites de Valor: valores mínimos e máximos por procedimento. CID Compatível: compatibilidade entre diagnóstico e procedimento."
        },
        {
          titulo: "Como criar uma regra personalizada",
          conteudo: "Selecione a operadora, clique em 'Nova Regra', escolha o tipo, descreva a regra detalhadamente e preencha campos específicos como código TUSS, valores ou prazos. A regra será aplicada automaticamente na validação de novos lotes."
        },
        {
          titulo: "Histórico de alterações de regras",
          conteudo: "Todas as alterações em regras são registradas com data e usuário responsável. Isso permite rastrear mudanças e entender o impacto nas validações ao longo do tempo."
        }
      ]
    }
  ];

  const faqs = [
    {
      pergunta: "O que é o padrão TISS?",
      resposta: "TISS (Troca de Informações na Saúde Suplementar) é o padrão obrigatório estabelecido pela ANS para troca de informações entre prestadores de serviços de saúde e operadoras de planos de saúde no Brasil."
    },
    {
      pergunta: "Por que minhas guias são glosadas?",
      resposta: "Glosas ocorrem por diversos motivos: falta de autorização prévia, documentação incompleta, incompatibilidade entre CID e procedimento TUSS, valores fora dos limites contratuais, ou erros de preenchimento. Use a IA Copiloto para análise detalhada."
    },
    {
      pergunta: "Como funciona a validação automática?",
      resposta: "Ao fazer upload de um XML TISS, o sistema aplica as regras cadastradas da operadora, verifica a estrutura do arquivo, compatibilidade entre CID e TUSS, limites de valores e documentação obrigatória, gerando um score de risco."
    },
    {
      pergunta: "Posso editar os dados extraídos pelo OCR?",
      resposta: "Sim! Após o processamento OCR, todos os campos são editáveis. Clique em 'Editar Campos' para corrigir qualquer informação antes de criar o lote."
    },
    {
      pergunta: "Como exportar relatórios?",
      resposta: "Acesse o módulo de Relatórios, selecione o tipo de relatório desejado, aplique filtros de data e operadora, e clique em 'Exportar' escolhendo entre PDF ou Excel."
    },
    {
      pergunta: "O sistema salva meu histórico de conversas com a IA?",
      resposta: "Sim, todas as interações com a IA Copiloto são salvas no banco de dados e associadas ao seu usuário e lote (quando aplicável), permitindo consultar análises anteriores."
    }
  ];

  const tutoriaisFiltrados = tutoriais.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      !busca || 
      item.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      item.conteudo.toLowerCase().includes(busca.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  const faqsFiltrados = faqs.filter(faq =>
    !busca ||
    faq.pergunta.toLowerCase().includes(busca.toLowerCase()) ||
    faq.resposta.toLowerCase().includes(busca.toLowerCase())
  );

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
                <HelpCircle className="h-8 w-8 text-primary" />
                Central de Ajuda
              </h1>
              <p className="text-muted-foreground mt-1">Tutoriais, FAQs e documentação completa</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-5xl">
        {/* Busca */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar tutoriais, FAQs ou tópicos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 text-base h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tutoriais */}
        <div className="space-y-6 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-4">Tutoriais</h2>
            <p className="text-muted-foreground mb-6">
              Guias passo a passo para usar todas as funcionalidades do ZeroGlosa
            </p>
          </div>

          {tutoriaisFiltrados.map((categoria, idx) => {
            const Icon = categoria.icon;
            return (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {categoria.categoria}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {categoria.items.map((item, itemIdx) => (
                      <AccordionItem key={itemIdx} value={`item-${idx}-${itemIdx}`}>
                        <AccordionTrigger className="text-left">
                          {item.titulo}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.conteudo}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQs */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Perguntas Frequentes</h2>
            <p className="text-muted-foreground mb-6">
              Respostas rápidas para dúvidas comuns
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {faqsFiltrados.map((faq, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-left">
                      {faq.pergunta}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.resposta}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Sem Resultados */}
        {busca && tutoriaisFiltrados.length === 0 && faqsFiltrados.length === 0 && (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground">
                Tente buscar com outras palavras-chave
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contato */}
        <Card className="mt-12 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Ainda precisa de ajuda?</CardTitle>
            <CardDescription>
              Nossa equipe de suporte está pronta para ajudá-lo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat ao Vivo
              </Button>
              <Button variant="outline" className="gap-2">
                <Video className="h-4 w-4" />
                Agendar Demonstração
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
