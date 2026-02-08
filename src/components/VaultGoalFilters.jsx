import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VaultGoalFilters({ sortBy, onSortChange }) {
  const sortOptions = [
    { value: 'progress', label: 'Mais próxima de completar', icon: '🎯' },
    { value: 'value', label: 'Maior valor', icon: '💰' },
    { value: 'oldest', label: 'Mais antiga', icon: '📅' },
    { value: 'newest', label: 'Mais recente', icon: '✨' }
  ];

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Filter className="w-4 h-4" />
        <span>Ordenar por:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sortOptions.map(option => (
          <Button
            key={option.value}
            onClick={() => onSortChange(option.value)}
            variant={sortBy === option.value ? "default" : "outline"}
            size="sm"
            className={`
              ${sortBy === option.value 
                ? 'bg-gradient-to-r from-cyan-500 to-magenta-500 text-white border-none' 
                : 'border-gray-700 text-gray-400 hover:border-cyan-500/50'
              }
            `}
          >
            <span className="mr-1">{option.icon}</span>
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}