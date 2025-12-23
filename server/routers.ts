import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  operadoras: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllOperadoras();
    }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string(),
        codigo: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.createOperadora(input);
      }),
  }),

  lotes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getLotesByUserId(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getLoteById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        operadoraId: z.number(),
        numeroLote: z.string().optional(),
        origem: z.enum(["xml", "ocr"]),
        xmlUrl: z.string().optional(),
        valorTotal: z.number().optional(),
        quantidadeGuias: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createLote({
          userId: ctx.user.id,
          ...input,
        });
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pronto", "revisar", "critico", "enviado", "aprovado", "glosa"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateLote(input.id, { status: input.status });
        return { success: true };
      }),
    uploadXML: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileContent: z.string(),
        operadoraId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Upload do arquivo XML para S3
        const fileBuffer = Buffer.from(input.fileContent, 'base64');
        const fileKey = `lotes/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, fileBuffer, 'application/xml');

        // Criar lote no banco
        await db.createLote({
          userId: ctx.user.id,
          operadoraId: input.operadoraId,
          origem: 'xml',
          xmlUrl: url,
          status: 'revisar',
        });

        return { success: true, url };
      }),
  }),

  guias: router({
    listByLote: protectedProcedure
      .input(z.object({ loteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGuiasByLoteId(input.loteId);
      }),
    create: protectedProcedure
      .input(z.object({
        loteId: z.number(),
        nomePaciente: z.string().optional(),
        cpfPaciente: z.string().optional(),
        numeroCarteirinha: z.string().optional(),
        dataProcedimento: z.date().optional(),
        codigoTUSS: z.string().optional(),
        cid: z.string().optional(),
        valorProcedimento: z.number().optional(),
        nomeMedico: z.string().optional(),
        crm: z.string().optional(),
        numeroAutorizacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createGuia(input);
      }),
  }),

  regras: router({
    listByOperadora: protectedProcedure
      .input(z.object({ operadoraId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRegrasByOperadoraId(input.operadoraId);
      }),
    create: protectedProcedure
      .input(z.object({
        operadoraId: z.number(),
        tipoRegra: z.enum(["autorizacao_previa", "documentos_obrigatorios", "limites_valor", "cid_compativel"]),
        descricao: z.string(),
        codigoTUSS: z.string().optional(),
        valorMinimo: z.number().optional(),
        valorMaximo: z.number().optional(),
        prazoAutorizacao: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createRegra(input);
      }),
  }),

  ocr: router({
    processImage: protectedProcedure
      .input(z.object({
        imageData: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Upload da imagem para S3
        const imageBuffer = Buffer.from(input.imageData, 'base64');
        const fileKey = `ocr/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, imageBuffer, 'image/jpeg');

        // Criar registro de conversão OCR
        await db.createConversaoOCR({
          userId: ctx.user.id,
          imagemUrl: url,
          status: 'processando',
        });

        // Aqui seria integrado um serviço OCR real (Tesseract, Google Vision, etc)
        // Por enquanto, retornamos dados simulados
        return {
          success: true,
          imageUrl: url,
          extractedData: {
            nomePaciente: "João da Silva",
            cpfPaciente: "123.456.789-00",
            numeroCarteirinha: "123456789",
            codigoTUSS: "10101012",
            cid: "M54.5",
            valorProcedimento: 15000,
            nomeMedico: "Dr. Carlos Santos",
            crm: "12345-SP",
          }
        };
      }),
  }),

  ia: router({
    chat: protectedProcedure
      .input(z.object({
        message: z.string(),
        loteId: z.number().optional(),
        contexto: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let contextoCompleto = "";
        
        // Se um lote foi selecionado, buscar dados completos para contexto
        if (input.loteId) {
          const lote = await db.getLoteById(input.loteId);
          if (lote) {
            const operadora = await db.getOperadoraById(lote.operadoraId);
            const regras = await db.getRegrasByOperadoraId(lote.operadoraId);
            
            contextoCompleto = `\n\nCONTEXTO DO LOTE SELECIONADO:
- ID do Lote: ${lote.id}
- Operadora: ${operadora?.nome || 'Não identificada'}
- Score de Risco: ${lote.scoreRisco ?? 0}% ${(lote.scoreRisco ?? 0) > 70 ? '(ALTO RISCO - REQUER CORREÇÃO URGENTE)' : (lote.scoreRisco ?? 0) > 40 ? '(Risco Médio - Revisar)' : '(Baixo Risco)'}
- Status: ${lote.status}
- Valor Total: R$ ${((lote.valorTotal || 0) / 100).toFixed(2)}
- Quantidade de Guias: ${lote.quantidadeGuias}
- Origem: ${lote.origem === 'ocr' ? 'Convertido via OCR' : 'Upload XML TISS'}
- Data de Criação: ${lote.createdAt?.toLocaleDateString('pt-BR')}

REGRAS ATIVAS DA OPERADORA:
${regras.map(r => `- ${r.tipoRegra.replace(/_/g, ' ').toUpperCase()}: ${r.descricao}`).join('\n') || 'Nenhuma regra cadastrada'}

IMPORTANTE: Sua análise deve ser PREVENTIVA. Identifique problemas que podem causar glosa ANTES do envio à operadora e sugira correções específicas.`;
          }
        }

        const systemPrompt = `Você é um assistente especializado em PREVENÇÃO de glosas médicas e validação pré-envio de guias TISS.

Seu objetivo principal é:
1. Analisar lotes ANTES do envio à operadora
2. Identificar problemas que podem causar glosa
3. Sugerir correções específicas e acionáveis
4. Explicar regras das operadoras de forma clara
5. Ajudar a evitar retrabalho e perdas financeiras

Quando um lote estiver selecionado, use os dados fornecidos para fazer análises CONCRETAS e ESPECÍFICAS, não genéricas.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.message + contextoCompleto },
          ],
        });

        const respostaContent = response.choices[0]?.message?.content;
        const resposta = typeof respostaContent === 'string' ? respostaContent : "Desculpe, não consegui processar sua solicitação.";

        // Salvar interação no banco
        await db.createInteracaoIA({
          userId: ctx.user.id,
          loteId: input.loteId,
          tipoInteracao: 'chat',
          pergunta: input.message,
          resposta,
          contexto: contextoCompleto || input.contexto,
        });

        return { resposta };
      }),
    explicarRisco: protectedProcedure
      .input(z.object({
        loteId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const lote = await db.getLoteById(input.loteId);
        if (!lote) {
          throw new Error("Lote não encontrado");
        }

        const operadora = await db.getOperadoraById(lote.operadoraId);
        const regras = await db.getRegrasByOperadoraId(lote.operadoraId);
        
        const scoreRisco = lote.scoreRisco ?? 0;
        const nivelRisco = scoreRisco > 70 ? 'ALTO RISCO (CRÍTICO)' : scoreRisco > 40 ? 'RISCO MÉDIO' : 'BAIXO RISCO';

        const prompt = `Analise este lote de guias TISS ANTES DO ENVIO e identifique problemas que podem causar glosa:

DADOS DO LOTE:
- ID: ${lote.id}
- Operadora: ${operadora?.nome || 'Não identificada'} (Código: ${operadora?.codigo || 'N/A'})
- Score de Risco: ${scoreRisco}% - NÍVEL: ${nivelRisco}
- Status Atual: ${lote.status}
- Valor Total: R$ ${((lote.valorTotal || 0) / 100).toFixed(2)}
- Quantidade de Guias: ${lote.quantidadeGuias}
- Origem: ${lote.origem === 'ocr' ? 'Convertido via OCR (maior risco de erros de extração)' : 'Upload XML TISS'}
- Criado em: ${lote.createdAt?.toLocaleDateString('pt-BR')}

REGRAS ATIVAS DA OPERADORA ${operadora?.nome || ''}:
${regras.map(r => `• ${r.tipoRegra.replace(/_/g, ' ').toUpperCase()}: ${r.descricao}${r.codigoTUSS ? ` (TUSS: ${r.codigoTUSS})` : ''}${r.valorMinimo || r.valorMaximo ? ` (Limite: R$ ${(r.valorMinimo || 0)/100} - R$ ${(r.valorMaximo || 999999)/100})` : ''}`).join('\n') || 'Nenhuma regra específica cadastrada - use regras gerais da ANS'}

SUA TAREFA:
1. Identifique ESPECIFICAMENTE quais regras podem estar sendo violadas
2. Explique POR QUE o score está em ${scoreRisco}%
3. Liste PROBLEMAS CONCRETOS que podem causar glosa
4. Forneça CORREÇÕES ESPECÍFICAS que devem ser feitas ANTES do envio
5. Priorize as ações por impacto (o que corrigir primeiro)

LEMBRE-SE: O objetivo é PREVENIR a glosa, não recuperar depois. Seja específico e acionável.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em PREVENÇÃO de glosas médicas. Sua função é identificar problemas ANTES do envio à operadora e sugerir correções específicas. Seja direto, prático e baseie-se nos dados fornecidos." },
            { role: "user", content: prompt },
          ],
        });

        const analiseContent = response.choices[0]?.message?.content;
        const analise = typeof analiseContent === 'string' ? analiseContent : "Não foi possível analisar o lote.";

        await db.createInteracaoIA({
          userId: ctx.user.id,
          loteId: input.loteId,
          tipoInteracao: 'explicar_risco',
          pergunta: prompt,
          resposta: analise,
        });

        return { analise };
      }),
    gerarRecurso: protectedProcedure
      .input(z.object({
        loteId: z.number(),
        motivoGlosa: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const lote = await db.getLoteById(input.loteId);
        if (!lote) {
          throw new Error("Lote não encontrado");
        }
        
        const operadora = await db.getOperadoraById(lote.operadoraId);
        
        const prompt = `Gere um texto formal e profissional de recurso de glosa médica com base nos seguintes dados:

DADOS DO LOTE GLOSADO:
- Operadora: ${operadora?.nome || 'Não identificada'}
- Valor do Lote: R$ ${((lote.valorTotal || 0) / 100).toFixed(2)}
- Quantidade de Guias: ${lote.quantidadeGuias}
- Data de Criação: ${lote.createdAt?.toLocaleDateString('pt-BR')}

MOTIVO DA GLOSA INFORMADO PELA OPERADORA:
"${input.motivoGlosa}"

REQUISITOS DO TEXTO:
1. Iniciar com identificação formal (prestador, lote, operadora)
2. Descrever o motivo da glosa apresentado pela operadora
3. Apresentar argumentação técnica contestando a glosa
4. Citar normas específicas da ANS (RN, RDC) quando aplicável
5. Solicitar formalmente a reversão da glosa
6. Manter tom profissional, respeitoso mas firme
7. Incluir espaço para assinatura e data ao final

IMPORTANTE: Lembre que o ideal é PREVENIR glosas antes do envio. Este recurso só deve ser usado quando a glosa já ocorreu.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em recursos de glosas médicas e normas da ANS. Gere textos formais, técnicos e persuasivos para contestação de glosas, sempre citando legislação pertinente." },
            { role: "user", content: prompt },
          ],
        });

        const recursoContent = response.choices[0]?.message?.content;
        const textoRecurso = typeof recursoContent === 'string' ? recursoContent : "Não foi possível gerar o recurso.";

        await db.createInteracaoIA({
          userId: ctx.user.id,
          loteId: input.loteId,
          tipoInteracao: 'gerar_recurso',
          pergunta: prompt,
          resposta: textoRecurso,
        });

        return { textoRecurso };
      }),
  }),

  dashboard: router({
    kpis: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDashboardKPIs(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
