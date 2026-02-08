import { base44 } from '../src/api/base44Client.js';

const rules = [
    { pattern: "Marcos Antonio de Souza", category: "Transferencia Contas", transaction_type: "expense" },
    { pattern: "RECEBIMENTO SALARIO", category: "TRANSFERENCIA ENTRE CONTAS", transaction_type: "income" },
    { pattern: "IFD*BRICHI BRICHI DRO ITU BRA", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Gilva marques oliveira me", category: "Impostos", transaction_type: "expense" },
    { pattern: "Pagamento Centauro ce171", category: "Vestuário", transaction_type: "expense" },
    { pattern: "Pagamento com QR Pix CONSELHO REGIONAL DE CONTABILIDADE DO ESTADO SAO PAULO", category: "Serviços", transaction_type: "expense" },
    { pattern: "CRUZEIRO DO SUL EDUCACIONAL S.A.", category: "Impostos", transaction_type: "expense" },
    { pattern: "Pagamento com QR Pix CRUZEIRO DO SUL EDUCACIONAL S.A.", category: "Impostos", transaction_type: "expense" },
    { pattern: "Pagamento com QR Pix COMPANHIA ITUANA DE SANEAMENTO - CIS", category: "Moradia", transaction_type: "expense" },
    { pattern: "Dinheiro retirado Carro", category: "Resgate Cofre", transaction_type: "income" },
    { pattern: "Pagamento com QR Pix Claro", category: "Internet casa", transaction_type: "expense" },
    { pattern: "IFD*", category: "Alimentação", transaction_type: "expense" },
    { pattern: "ATENDVEND IMOBILIARIA E REPRES", category: "Aluguel", transaction_type: "expense" },
    { pattern: "MARCAO LANCHES ITU BRA", category: "Alimentação", transaction_type: "expense" },
    { pattern: "JF REFEICOES ITU BRA", category: "Alimentação", transaction_type: "expense" },
    { pattern: "MARCOS ANTONIO DE SOUZA", category: "TRANSFERENCIA ENTRE CONTAS", transaction_type: "income" },
    { pattern: "MARCOS ANTONIO DE SOUZA", category: "Transferencia Contas", transaction_type: "expense" },
    { pattern: "CRUZEIRO*-*SM SAO PAULO BRA", category: "Educação/Certificação", transaction_type: "expense" },
    { pattern: "RECEBIMENTO SALARIO", category: "TRANSFERENCIA ENTRE CONTAS", transaction_type: "income" },
    { pattern: "CLINICA ODONTOLOGICA S ITU BRA", category: "Saúde", transaction_type: "expense" },
    { pattern: "CRUZEIRO DO SUL EDUCACIONAL S A", category: "Educação/Certificação", transaction_type: "expense" },
    { pattern: "TRIBUTOS FEDERAIS DARF NUMERADO", category: "Taxas Diversas", transaction_type: "expense" },
    { pattern: " Pagamento Mp*thiagofelipep", category: "Alimentação", transaction_type: "expense" },
    { pattern: "sup sao vicente", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Liberação de dinheiro", category: "Reembolso", transaction_type: "income" },
    { pattern: "Transferência Pix recebida Amanda Prandini", category: "Reembolso", transaction_type: "income" },
    { pattern: "Carrefour", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Ebn *docusign", category: "Assinaturas", transaction_type: "expense" },
    { pattern: "Pagamento Posto de servicos losp", category: "Combustivel", transaction_type: "expense" },
    { pattern: "Pagamento Grupo casas bahia sa", category: "Eletrodomesticos/Utilidades", transaction_type: "expense" },
    { pattern: "Transferência Pix enviada LUIS GUSTAVO CORREA BARBOSA", category: "Eletrodomesticos/Utilidades", transaction_type: "expense" },
    { pattern: "Compra de Tapete Porta Quebra Cabeça Até 3000 Peças Castela Mercado Livre", category: "Lazer/Diversão", transaction_type: "expense" },
    { pattern: "Compra de Puzzle 2000 Peças A Escola De Atenas Mercado Livre", category: "Lazer/Diversão", transaction_type: "expense" },
    { pattern: "Pagamento Kadri pizzaria itu ltd", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Lojas renner fl 4", category: "Vestuario", transaction_type: "expense" },
    { pattern: "Pagamento Posto avenida marginal", category: "Combustivel", transaction_type: "expense" },
    { pattern: "Pagamento Pao de acucar- 0506@ @", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Riachuelo 256", category: "Vestuario", transaction_type: "expense" },
    { pattern: "Dinheiro retirado Carro", category: "Resgate Cofre", transaction_type: "income" },
    { pattern: "Pagamento iFood", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Atacadao 816 as", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Gislaine Vieira Furquim", category: "Lazer/Diversão", transaction_type: "expense" },
    { pattern: "MIRANDA", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Outback steakhouse", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento com QR Pix UBER DO BRASIL TECNOLOGIA LTDA.", category: "Transporte", transaction_type: "expense" },
    { pattern: "Rendimentos", category: "Rendimentos", transaction_type: "income" },
    { pattern: "Pagamento Cruzeiro*-*sm", category: "Educação/Certificação", transaction_type: "expense" },
    { pattern: "Pagamento Concessionaria rodovia", category: "Estacionamento/Pedagio", transaction_type: "expense" },
    { pattern: "Pagamento com QR Pix Bm Digital Ltda", category: "Assinaturas", transaction_type: "expense" },
    { pattern: "Pagamento Marcao lanches", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Niki restaurante", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento de contas Banco Cooperativo Sicredi S. A.", category: "Aluguel", transaction_type: "expense" },
    { pattern: "Pagamento Carrefour cit", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Jf refeicoes", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Bradesco S.A.", category: "Educação/Certificação", transaction_type: "expense" },
    { pattern: "Pagamento Supermercados pag", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Drogal itu", category: "Saúde", transaction_type: "expense" },
    { pattern: "Transferência Pix recebida Murilo Machado", category: "Reembolso", transaction_type: "income" },
    { pattern: "Pagamento com QR Pix WMS SUPERMERCADOS DO BRASIL LTDA.", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Rendimentos", category: "Rendimentos", transaction_type: "income" },
    { pattern: "Pagamento Restaurante", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento Base44", category: "Assinaturas", transaction_type: "expense" },
    { pattern: "Pagamento Atacadao 816 as", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento iFood", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Transferência Pix recebida MARCOS ANTONIO DE SOUZA", category: "Salarios", transaction_type: "income" },
    { pattern: "Dinheiro retirado Carro", category: "Resgate Cofre", transaction_type: "income" },
    { pattern: "Pagamento com QR Pix GRUPO CASAS BAHIA S.A.", category: "Eletrodomesticos/Utilidades", transaction_type: "expense" },
    { pattern: "Pagamento Netflix", category: "Assinaturas", transaction_type: "expense" },
    { pattern: "Pagamento Posto puma ltda", category: "Combustivel", transaction_type: "expense" },
    { pattern: "Dinheiro reservado Carro", category: "Resgate Cofre", transaction_type: "expense" },
    { pattern: "Transferência Pix enviada Juliana Fatima Gomes Silva", category: "Lazer/Diversão", transaction_type: "expense" },
    { pattern: "Pagamento Lojas americanas", category: "Alimentação", transaction_type: "expense" },
    { pattern: "Pagamento com QR Pix INGRESSO COM LTDA", category: "Lazer/Diversão", transaction_type: "expense" },
    { pattern: "Pagamento com QR Pix POSTO DE SERVICOS LOSPER LTDA", category: "Combustivel", transaction_type: "expense" },
    { pattern: "Transferência Pix enviada Elaine Cristina Barbosa Guimaraes", category: "Energia/Agua", transaction_type: "expense" },
    { pattern: "Compra de Rancho Urbano Ub Tabuleiro De Xadrez Luxo Dourado E Prateado Luxo Inglês...", category: "Lazer/Diversão", transaction_type: "expense" },
    { pattern: "Luciano Antunes", category: "Lazer/Diversão", transaction_type: "expense" },
    { pattern: "Pagamento Auto posto classe", category: "Combustivel", transaction_type: "expense" }
];

async function migrate() {
    console.log('🚀 Iniciando migração de regras...');
    let successCount = 0;
    for (const rule of rules) {
        try {
            await base44.entities.TransactionRule.create({
                ...rule,
                match_type: 'contains',
                priority: 10
            });
            successCount++;
        } catch (e) {
            console.error(`❌ Erro na regra ${rule.pattern}:`, e.message);
        }
    }
    console.log(`✅ Migração concluída: ${successCount} regras importadas.`);
}

migrate();
