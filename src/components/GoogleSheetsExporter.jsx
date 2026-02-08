import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Download, Loader2, ExternalLink, FileText, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import NeonCard from './NeonCard';

export default function GoogleSheetsExporter() {
  const [exporting, setExporting] = useState(false);
  const [lastExportUrl, setLastExportUrl] = useState(null);

  const exportReport = async (reportType) => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportToGoogleSheets', {
        report_type: reportType
      });

      if (response.data.success) {
        setLastExportUrl(response.data.spreadsheet_url);
        toast.success('✅ Relatório exportado!', {
          description: 'Clique para abrir no Google Sheets',
          action: {
            label: 'Abrir',
            onClick: () => window.open(response.data.spreadsheet_url, '_blank')
          }
        });
      }
    } catch (error) {
      toast.error('❌ Erro ao exportar');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const reports = [
    {
      type: 'dre',
      name: 'DRE Mensal',
      description: 'Demonstração do Resultado do Exercício',
      icon: BarChart3,
      color: 'from-green-500 to-emerald-500'
    },
    {
      type: 'balance',
      name: 'Balanço Patrimonial',
      description: 'Ativos, Passivos e Patrimônio Líquido',
      icon: TrendingUp,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      type: 'transactions',
      name: 'Histórico de Transações',
      description: 'Todas as transações registradas',
      icon: FileText,
      color: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <NeonCard glowColor="green">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <FileSpreadsheet className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Google Sheets</h2>
          <p className="text-slate-400 text-sm">Exporte relatórios profissionais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <motion.div
              key={report.type}
              whileHover={{ scale: 1.02 }}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-green-500/50 transition-all"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${report.color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold mb-1">{report.name}</h3>
              <p className="text-slate-400 text-xs mb-4">{report.description}</p>
              <Button
                onClick={() => exportReport(report.type)}
                disabled={exporting}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </>
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {lastExportUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
        >
          <p className="text-green-400 text-sm mb-2">📊 Último relatório exportado:</p>
          <a
            href={lastExportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white hover:text-green-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir no Google Sheets
          </a>
        </motion.div>
      )}
    </NeonCard>
  );
}