import { cn } from '@/lib/utils';

export default function NeonCard({ children, className, glowColor = "cyan", onClick = undefined }) {
  const glowColors = {
    cyan: "shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]",
    magenta: "shadow-[0_0_20px_rgba(255,0,255,0.3)] hover:shadow-[0_0_30px_rgba(255,0,255,0.5)]",
    green: "shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_30px_rgba(57,255,20,0.5)]",
    purple: "shadow-[0_0_20px_rgba(138,43,226,0.3)] hover:shadow-[0_0_30px_rgba(138,43,226,0.5)]",
    gold: "shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)]"
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-gradient-to-br from-[#1a1a2e]/90 to-[#0f0f1e]/90 rounded-2xl p-6 border border-cyan-500/30 backdrop-blur-sm transition-all duration-300",
        glowColors[glowColor],
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}