import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image_url } = await req.json();

    if (!image_url) {
      return Response.json({ error: 'image_url é obrigatório' }, { status: 400 });
    }

    // Usar Core.InvokeLLM com visão para extrair dados do comprovante
    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um especialista em extrair informações de comprovantes financeiros.

Analise esta imagem de comprovante e extraia as seguintes informações:
1. Data da transação (formato YYYY-MM-DD)
2. Valor total (apenas o número, sem símbolos)
3. Nome do estabelecimento/local
4. Sugira uma categoria financeira apropriada (ex: Alimentação, Transporte, Lazer, Saúde, Educação, Moradia, etc.)

IMPORTANTE: Retorne APENAS os dados extraídos, sem explicações adicionais.`,
      file_urls: [image_url],
      response_json_schema: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data no formato YYYY-MM-DD" },
          value: { type: "number", description: "Valor numérico" },
          location: { type: "string", description: "Nome do estabelecimento" },
          suggested_category: { type: "string", description: "Categoria sugerida" }
        },
        required: ["date", "value", "location", "suggested_category"]
      }
    });

    // Criar registro OCRReceipt
    const ocrReceipt = await base44.entities.OCRReceipt.create({
      image_url,
      extracted_date: extractionResult.date,
      extracted_value: extractionResult.value,
      extracted_location: extractionResult.location,
      suggested_category: extractionResult.suggested_category,
      status: 'pending'
    });

    // Notificar usuário via Sir Coin no WhatsApp sobre a extração
    try {
      await base44.asServiceRole.conversations.sendMessage({
        agent_name: 'tactical_oracle',
        user_id: user.id || user.email,
        message: `⚔️ *RELATÓRIO DE BATEDOR: Novo artefato (comprovante) escaneado!*\n\n📍 Local: ${extractionResult.location}\n💰 Valor: R$ ${extractionResult.value.toFixed(2)}\n📅 Data: ${extractionResult.date}\n📁 Categoria: ${extractionResult.suggested_category}\n\nO gasto foi registrado nas crônicas do Reino com status 'pendente'.`
      });
    } catch (notifyError) {
      console.error('Failed to notify via WhatsApp:', notifyError);
    }

    return Response.json({
      success: true,
      receipt: ocrReceipt,
      extracted_data: extractionResult
    });

  } catch (error) {
    console.error('Erro ao processar OCR:', error);
    return Response.json({
      error: 'Erro ao processar imagem',
      details: error.message
    }, { status: 500 });
  }
});