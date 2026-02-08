import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, TrendingUp, Target, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function SmartNotifications({ user }) {
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['smartNotifications', user.email],
    queryFn: () => base44.entities.SmartNotification.filter({ created_by: user.email }, '-created_date', 10)
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.SmartNotification.update(notificationId, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['smartNotifications']);
    }
  });

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      critical: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[priority] || colors.medium;
  };

  const getTypeIcon = (type) => {
    const icons = {
      budget_alert: AlertTriangle,
      mission_expiring: Target,
      pattern_detected: TrendingUp,
      milestone_reached: CheckCircle,
      goal_progress: Target
    };
    return icons[type] || Bell;
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-cyan-400" />
          <h3 className="text-xl font-black text-white">Notificações Inteligentes</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {notifications?.map((notification, idx) => {
            const Icon = getTypeIcon(notification.notification_type);
            
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className={`relative rounded-xl p-4 border backdrop-blur-sm ${
                  notification.read 
                    ? 'bg-slate-800/30 border-slate-700/50' 
                    : 'bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/50'
                }`}
              >
                {!notification.read && (
                  <div className="absolute top-2 left-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                )}

                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPriorityColor(notification.priority)}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-bold">{notification.title}</h4>
                        <p className="text-slate-400 text-sm mt-1">{notification.message}</p>
                      </div>
                      
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          className="text-slate-500 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {notification.action_url && (
                      <Link to={notification.action_url}>
                        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 mt-2">
                          Ver Detalhes →
                        </Button>
                      </Link>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {notification.priority}
                      </Badge>
                      <span className="text-slate-500 text-xs">
                        {new Date(notification.created_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {(!notifications || notifications.length === 0) && (
          <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-slate-700">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Sem notificações no momento</p>
            <p className="text-slate-500 text-sm">Você receberá insights inteligentes aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}