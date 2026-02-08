import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Processa dados para gráficos de pizza/donnut no padrão Base 44.
 * Agrupa valores pequenos em uma categoria "Outros".
 *
 * @param {Array} data - Array de objetos { name, value, ... }
 * @param {number} maxSlices - Número máximo de fatias visíveis (padrão: 5)
 * @param {string} otherLabel - Nome da categoria agrupada (padrão: "Outros")
 * @param {string} otherColor - Cor hex para a fatia "Outros" (padrão: #64748b - Slate 500)
 */
export function groupSmallValues(data, maxSlices = 5, otherLabel = "Outros", otherColor = "#334155") {
  if (!data || data.length === 0) return [];

  // 1. Ordenar decrescente para garantir que os maiores fiquem visíveis
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  // 2. Se tivermos menos itens que o limite, retorna como está
  if (sortedData.length <= maxSlices) {
    return sortedData;
  }

  // 3. Separar os 'top' itens e o resto
  const topItems = sortedData.slice(0, maxSlices);
  const othersItems = sortedData.slice(maxSlices);

  // 4. Calcular o total de "Outros"
  const othersValue = othersItems.reduce((acc, curr) => acc + curr.value, 0);

  // 5. Se o valor de "Outros" for relevante (> 0), adiciona ao final
  if (othersValue > 0) {
    topItems.push({
      name: otherLabel,
      value: othersValue,
      fill: otherColor,
      color: otherColor, // Para compatibilidade com diferentes implementações
      details: othersItems 
    });
  }

  return topItems;
}