import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Brain, Loader2, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ShopItemImporter() {
  const queryClient = useQueryClient();
  
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const [phase, setPhase] = useState(1); // 1: Upload, 2: Mapping, 3: Confirmation
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    name: '',
    description: '',
    type: '',
    category: '',
    price: '',
    icon: '',
    rarity: '',
    level_required: '',
    stock: ''
  });
  const [mappedItems, setMappedItems] = useState([]);

  // Load SheetJS from CDN
  useEffect(() => {
    if (window.XLSX) {
      setXlsxLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
    script.onload = () => setXlsxLoaded(true);
    script.onerror = () => {
      toast.error('Erro ao carregar biblioteca de leitura de planilhas');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!xlsxLoaded) {
      toast.error('Aguarde o carregamento da biblioteca...');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
          toast.error('Arquivo vazio ou sem dados');
          return;
        }

        const headers = jsonData[0].map(h => String(h || ''));
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell));

        setHeaders(headers);
        setRows(rows);
        setPhase(2);
        toast.success(`${rows.length} itens detectados!`);
      } catch (error) {
        toast.error('Erro ao ler arquivo', {
          description: error.message
        });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Process and validate data
  const processData = () => {
    // Validation
    if (!columnMapping.name || !columnMapping.price || !columnMapping.type) {
      toast.error('Selecione pelo menos Nome, Preço e Tipo');
      return;
    }

    const items = rows.map(row => {
      const nameIdx = headers.indexOf(columnMapping.name);
      const descriptionIdx = columnMapping.description ? headers.indexOf(columnMapping.description) : -1;
      const typeIdx = headers.indexOf(columnMapping.type);
      const categoryIdx = columnMapping.category ? headers.indexOf(columnMapping.category) : -1;
      const priceIdx = headers.indexOf(columnMapping.price);
      const iconIdx = columnMapping.icon ? headers.indexOf(columnMapping.icon) : -1;
      const rarityIdx = columnMapping.rarity ? headers.indexOf(columnMapping.rarity) : -1;
      const levelIdx = columnMapping.level_required ? headers.indexOf(columnMapping.level_required) : -1;
      const stockIdx = columnMapping.stock ? headers.indexOf(columnMapping.stock) : -1;

      return {
        name: String(row[nameIdx] || '').trim(),
        description: descriptionIdx >= 0 ? String(row[descriptionIdx] || '').trim() : '',
        type: String(row[typeIdx] || 'cosmetic').toLowerCase().trim(),
        category: categoryIdx >= 0 ? String(row[categoryIdx] || 'avatar').toLowerCase().trim() : 'avatar',
        price: parseInt(String(row[priceIdx] || '0').replace(/[^\d]/g, '')) || 0,
        icon: iconIdx >= 0 ? String(row[iconIdx] || '✨').trim() : '✨',
        rarity: rarityIdx >= 0 ? String(row[rarityIdx] || 'common').toLowerCase().trim() : 'common',
        level_required: levelIdx >= 0 ? parseInt(row[levelIdx]) || 1 : 1,
        stock: stockIdx >= 0 ? parseInt(row[stockIdx]) || -1 : -1
      };
    }).filter(item => item.name && item.price > 0);

    setMappedItems(items);
    setPhase(3);
    toast.success(`${items.length} itens validados!`);
  };

  // Import items to database
  const importItems = useMutation({
    mutationFn: async (items) => {
      return await base44.entities.ShopItem.bulkCreate(items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shopItems']);
      toast.success('🎉 Itens importados com sucesso!');
      resetImporter();
    },
    onError: (error) => {
      toast.error('Erro ao importar', {
        description: error.message
      });
    }
  });

  const resetImporter = () => {
    setPhase(1);
    setHeaders([]);
    setRows([]);
    setMappedItems([]);
    setColumnMapping({
      name: '',
      description: '',
      type: '',
      category: '',
      price: '',
      icon: '',
      rarity: '',
      level_required: '',
      stock: ''
    });
    
    const fileInput = document.getElementById('shop-file-upload');
    if (fileInput) fileInput.value = '';
  };

  const rarityColors = {
    common: 'border-gray-500',
    rare: 'border-blue-500',
    epic: 'border-purple-500',
    legendary: 'border-yellow-500'
  };

  return (
    <div className="space-y-6">
      {/* Phase 1: Upload */}
      {phase === 1 && (
        <NeonCard glowColor="magenta">
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <ShoppingBag className="w-10 h-10 text-magenta-400" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-black text-white">
                IMPORTAR ITENS DA LOJA
              </h2>
              <p className="text-gray-400 text-sm">
                Faça upload da planilha com os itens para validação
              </p>
            </div>
          </div>

          <input
            type="file"
            id="shop-file-upload"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={!xlsxLoaded}
            className="hidden"
          />
          
          <label htmlFor="shop-file-upload" className="cursor-pointer block">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-magenta-900/40 to-purple-900/40 border-4 border-magenta-500/50 rounded-2xl p-12 transition-all hover:shadow-[0_0_40px_rgba(255,0,255,0.4)]"
            >
              <div className="text-center space-y-4">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="text-6xl mb-4">🛍️</div>
                </motion.div>
                <div>
                  <h3 className="font-black text-2xl mb-2 text-magenta-400">
                    ZONA DE UPLOAD
                  </h3>
                  <p className="text-white text-lg mb-2">
                    {xlsxLoaded ? 'Clique para selecionar arquivo' : 'Carregando sistema...'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    CSV, Excel (.xlsx, .xls)
                  </p>
                </div>
              </div>
            </motion.div>
          </label>
        </NeonCard>
      )}

      {/* Phase 2: Mapping */}
      {phase === 2 && (
        <NeonCard glowColor="cyan">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Brain className="w-10 h-10 text-cyan-400" />
              <div>
                <h2 className="text-2xl font-black text-white">
                  VALIDAÇÃO DE DADOS
                </h2>
                <p className="text-gray-400 text-sm">
                  {rows.length} itens detectados
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
              <p className="text-cyan-400 font-bold mb-2">Colunas Detectadas:</p>
              <div className="flex flex-wrap gap-2">
                {headers.map((header, i) => (
                  <span key={i} className="bg-cyan-500/20 border border-cyan-500/50 rounded px-3 py-1 text-sm text-cyan-400">
                    {header}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white font-bold mb-2 block flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Nome do Item *
                </label>
                <Select value={columnMapping.name} onValueChange={(v) => setColumnMapping({...columnMapping, name: v})}>
                  <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white font-bold mb-2 block flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Preço (Gold Coins) *
                </label>
                <Select value={columnMapping.price} onValueChange={(v) => setColumnMapping({...columnMapping, price: v})}>
                  <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white font-bold mb-2 block flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Tipo *
                </label>
                <Select value={columnMapping.type} onValueChange={(v) => setColumnMapping({...columnMapping, type: v})}>
                  <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white font-bold mb-2 block">Descrição</label>
                <Select value={columnMapping.description} onValueChange={(v) => setColumnMapping({...columnMapping, description: v})}>
                  <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                    <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem descrição</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white font-bold mb-2 block">Categoria</label>
                <Select value={columnMapping.category} onValueChange={(v) => setColumnMapping({...columnMapping, category: v})}>
                  <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                    <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem categoria</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white font-bold mb-2 block">Ícone/Emoji</label>
                <Select value={columnMapping.icon} onValueChange={(v) => setColumnMapping({...columnMapping, icon: v})}>
                  <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                    <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Padrão (✨)</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white font-bold mb-2 block">Raridade</label>
                <Select value={columnMapping.rarity} onValueChange={(v) => setColumnMapping({...columnMapping, rarity: v})}>
                  <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                    <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Comum</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white font-bold mb-2 block">Nível Requerido</label>
                <Select value={columnMapping.level_required} onValueChange={(v) => setColumnMapping({...columnMapping, level_required: v})}>
                  <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                    <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Nível 1</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white font-bold mb-2 block">Estoque</label>
                <Select value={columnMapping.stock} onValueChange={(v) => setColumnMapping({...columnMapping, stock: v})}>
                  <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                    <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Ilimitado</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={resetImporter}
                variant="outline"
                className="border-gray-500/50 text-gray-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={processData}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                Validar Dados
              </Button>
            </div>
          </div>
        </NeonCard>
      )}

      {/* Phase 3: Confirmation */}
      {phase === 3 && (
        <NeonCard glowColor="green">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Check className="w-10 h-10 text-green-400" />
              <div>
                <h2 className="text-2xl font-black text-white">
                  CONFIRMAR IMPORTAÇÃO
                </h2>
                <p className="text-gray-400 text-sm">
                  {mappedItems.length} itens prontos para importar
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
            {mappedItems.slice(0, 10).map((item, idx) => (
              <div key={idx} className={`bg-[#0a0a1a] border-2 ${rarityColors[item.rarity]} rounded-lg p-4`}>
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{item.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{item.name}</h3>
                    <p className="text-gray-400 text-sm">{item.description || 'Sem descrição'}</p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-cyan-400">💰 {item.price} coins</span>
                      <span className="text-purple-400">⭐ {item.rarity}</span>
                      <span className="text-yellow-400">👑 Nível {item.level_required}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {mappedItems.length > 10 && (
              <p className="text-center text-gray-400 text-sm">
                ... e mais {mappedItems.length - 10} itens
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={resetImporter}
              variant="outline"
              className="border-gray-500/50 text-gray-400"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => importItems.mutate(mappedItems)}
              disabled={importItems.isPending}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {importItems.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Importação
                </>
              )}
            </Button>
          </div>
        </NeonCard>
      )}
    </div>
  );
}