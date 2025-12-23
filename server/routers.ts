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
        const systemPrompt = `Você é um assistente especializado em gestão de glosas médicas e faturamento TISS. 
        Ajude o usuário a entender regras de operadoras, validar guias e reduzir glosas.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.message },
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
          contexto: input.contexto,
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

        const prompt = `Analise este lote de guias TISS e explique os principais riscos de glosa:
        - Score de Risco: ${lote.scoreRisco}%
        - Status: ${lote.status}
        - Valor Total: R$ ${(lote.valorTotal || 0) / 100}
        - Quantidade de Guias: ${lote.quantidadeGuias}
        
        Forneça uma análise detalhada dos riscos e sugestões de correção.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em auditoria de contas médicas e glosas." },
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
        const prompt = `Gere um texto formal de recurso de glosa médica para o seguinte motivo:
        "${input.motivoGlosa}"
        
        O texto deve ser profissional, técnico e persuasivo, citando normas da ANS quando aplicável.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em recursos de glosas médicas e normas da ANS." },
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
