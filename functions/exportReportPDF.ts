import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_type, start_date, end_date } = await req.json();

    if (!report_type || !start_date || !end_date) {
      return Response.json({ error: 'report_type, start_date e end_date são obrigatórios' }, { status: 400 });
    }

    let reportData;

    if (report_type === 'dre') {
      const dreResponse = await base44.functions.invoke('getDREReport', { start_date, end_date });
      reportData = dreResponse.data;
    } else if (report_type === 'balance') {
      const balanceResponse = await base44.functions.invoke('getFinancialReports', { 
        period: { start_date, end_date } 
      });
      reportData = balanceResponse.data;
    }

    // Gerar conteúdo do relatório em texto formatado
    let reportContent = `
📊 RELATÓRIO FINANCEIRO - ${report_type.toUpperCase()}
Período: ${start_date} a ${end_date}
Usuário: ${user.full_name || user.email}
Gerado em: ${new Date().toLocaleString('pt-BR')}

==============================================
`;

    if (report_type === 'dre' && reportData) {
      reportContent += `
💰 RECEITAS: R$ ${reportData.dre?.revenue?.toFixed(2) || '0.00'}
🔥 DESPESAS: R$ ${reportData.dre?.expenses?.toFixed(2) || '0.00'}
⚔️ RESULTADO: R$ ${reportData.dre?.result?.toFixed(2) || '0.00'}
`;
    }

    // Retornar conteúdo como texto (WhatsApp enviará como mensagem)
    return Response.json({
      success: true,
      report_content: reportContent,
      message: 'Relatório gerado com sucesso. Envie este texto para o usuário.'
    });

  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});