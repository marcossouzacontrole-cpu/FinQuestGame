import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function NotionGoalSync({ goal }) {
  const queryClient = useQueryClient();
  const [lastSyncUrl, setLastSyncUrl] = useState(goal?.notion_page_url);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncGoalToNotion', {
        goal_id: goal.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setLastSyncUrl(data.notion_url);
        toast.success('✅ Meta sincronizada!', {
          description: 'Diário atualizado no Notion',
          action: {
            label: 'Abrir',
            onClick: () => window.open(data.notion_url, '_blank')
          }
        });
        queryClient.invalidateQueries(['allGoals']);
      }
    },
    onError: () => {
      toast.error('❌ Erro ao sincronizar com Notion');
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-4"
    >
      <div className="bg-slate-800/30 rounded-lg p-4 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Notion Sync</p>
              <p className="text-slate-400 text-xs">Diário de meta</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar
                </>
              )}
            </Button>

            {lastSyncUrl && (
              <Button
                onClick={() => window.open(lastSyncUrl, '_blank')}
                size="sm"
                variant="outline"
                className="border-purple-500/30 text-purple-400"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}