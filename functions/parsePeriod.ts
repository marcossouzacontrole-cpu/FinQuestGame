import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { period_text } = await req.json();

    if (!period_text) {
      return Response.json({ error: 'period_text é obrigatório' }, { status: 400 });
    }

    // Normalizar texto
    const text = period_text.toLowerCase().trim();
    const currentYear = new Date().getFullYear();

    // Padrão: "DRE 2025", "2025", "ano de 2025"
    const yearMatch = text.match(/(?:dre|ano|de)?\s*(\d{4})/);
    if (yearMatch) {
      const year = yearMatch[1];
      return Response.json({
        success: true,
        period: {
          start_date: `${year}-01-01`,
          end_date: `${year}-12-31`
        },
        label: `Ano ${year}`
      });
    }

    // Padrão: "06 a 12/2025", "06 a 12 de 2025", "junho a dezembro 2025"
    const rangeMatch = text.match(/(\d{1,2})\s*a\s*(\d{1,2})\s*[\/de]*\s*(\d{4})/);
    if (rangeMatch) {
      const startMonth = rangeMatch[1].padStart(2, '0');
      const endMonth = rangeMatch[2].padStart(2, '0');
      const year = rangeMatch[3];
      return Response.json({
        success: true,
        period: {
          start_date: `${year}-${startMonth}-01`,
          end_date: `${year}-${endMonth}-31`
        },
        label: `${startMonth}/${year} a ${endMonth}/${year}`
      });
    }

    // Padrão: "dezembro", "dez", "dezembro 2025"
    const monthNames = {
      'janeiro': '01', 'jan': '01',
      'fevereiro': '02', 'fev': '02',
      'março': '03', 'mar': '03', 'marco': '03',
      'abril': '04', 'abr': '04',
      'maio': '05', 'mai': '05',
      'junho': '06', 'jun': '06',
      'julho': '07', 'jul': '07',
      'agosto': '08', 'ago': '08',
      'setembro': '09', 'set': '09',
      'outubro': '10', 'out': '10',
      'novembro': '11', 'nov': '11',
      'dezembro': '12', 'dez': '12'
    };

    for (const [name, month] of Object.entries(monthNames)) {
      if (text.includes(name)) {
        const yearInText = text.match(/\d{4}/);
        const year = yearInText ? yearInText[0] : currentYear.toString();
        return Response.json({
          success: true,
          period: {
            start_date: `${year}-${month}-01`,
            end_date: `${year}-${month}-31`
          },
          label: `${name.charAt(0).toUpperCase() + name.slice(1)} ${year}`
        });
      }
    }

    // Padrão: "12/2025", "12-2025"
    const monthYearMatch = text.match(/(\d{1,2})[\/\-](\d{4})/);
    if (monthYearMatch) {
      const month = monthYearMatch[1].padStart(2, '0');
      const year = monthYearMatch[2];
      return Response.json({
        success: true,
        period: {
          start_date: `${year}-${month}-01`,
          end_date: `${year}-${month}-31`
        },
        label: `${month}/${year}`
      });
    }

    // Não conseguiu interpretar
    return Response.json({
      success: false,
      error: 'Não consegui interpretar o período. Use formatos como: "2025", "dezembro 2025", "06 a 12/2025", "12/2025"'
    }, { status: 400 });

  } catch (error) {
    console.error('Erro ao parsear período:', error);
    return Response.json({ 
      error: 'Erro ao processar período',
      details: error.message 
    }, { status: 500 });
  }
});