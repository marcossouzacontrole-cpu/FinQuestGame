import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const DefenseModuleCard = ({ category, budgeted, spent, onReallocate, onAddFunds }) => {
  const percentage = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
  const isCritical = percentage >= 90;
  const isBreached = spent > budgeted;
  const isHealthy = percentage < 50;
  
  // Cores baseadas no estado do "Escudo"
  const statusColor = isBreached 
    ? "bg-red-600" 
    : isCritical 
      ? "bg-amber-500" 
      : isHealthy 
        ? "bg-emerald-500" 
        : "bg-yellow-500";
  
  const iconColor = isBreached 
    ? "text-red-500" 
    : isCritical 
      ? "text-amber-500" 
      : "text-emerald-500";

  const remaining = budgeted - spent;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`relative overflow-hidden border-2 transition-all hover:scale-[1.02] ${
        isBreached 
          ? 'border-red-500 shadow-red-500/20 shadow-lg animate-pulse' 
          : isCritical 
            ? 'border-amber-500/50' 
            : 'border-slate-800'
      }`}>
        
        {/* Barra Lateral de Status */}
        <div className={`absolute top-0 left-0 w-1 h-full ${statusColor}`} />

        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            {isBreached ? (
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            ) : (
              <Shield className={`w-4 h-4 ${iconColor}`} />
            )}
            {category.name}
          </CardTitle>
          <Badge variant={isBreached ? "destructive" : "outline"} className="font-mono text-xs">
            {Math.round(percentage)}% DANO
          </Badge>
        </CardHeader>

        <CardContent>
          <div className="flex justify-between mb-2 text-xs font-mono">
            <span className={remaining >= 0 ? "text-emerald-400" : "text-red-400"}>
              HP: R$ {Math.abs(remaining).toFixed(2)} {remaining < 0 && "(NEGATIVO)"}
            </span>
            <span className="text-slate-500">MÁX: R$ {budgeted.toFixed(2)}</span>
          </div>

          {/* Barra de Progresso Customizada (Lifebar) */}
          <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative">
            <motion.div 
              className={`h-full ${statusColor} transition-all duration-500 ease-out`} 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            {/* Linhas de grade para parecer UI futurista */}
            <div className="absolute top-0 left-1/4 w-px h-full bg-black/40" />
            <div className="absolute top-0 left-2/4 w-px h-full bg-black/40" />
            <div className="absolute top-0 left-3/4 w-px h-full bg-black/40" />
          </div>

          <div className="text-center text-[10px] text-slate-600 uppercase tracking-widest mt-1 font-bold">
            {isBreached ? "🚨 BREACH DETECTED" : isCritical ? "⚠️ CRITICAL" : isHealthy ? "✅ STABLE" : "⏳ CAUTION"}
          </div>

          {/* Ações Rápidas */}
          <div className="flex gap-2 mt-3">
            {isBreached && (
              <Button 
                onClick={() => onReallocate(category)}
                variant="ghost" 
                size="sm" 
                className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs border border-dashed border-red-800"
              >
                <Zap className="w-3 h-3 mr-1" />
                REPARAR
              </Button>
            )}
            
            {!isBreached && remaining < budgeted * 0.2 && (
              <Button 
                onClick={() => onAddFunds(category)}
                variant="ghost" 
                size="sm" 
                className="flex-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 text-xs border border-dashed border-cyan-800"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                REFORÇAR
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DefenseModuleCard;