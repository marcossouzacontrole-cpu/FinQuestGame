import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, ShoppingCart, Package } from 'lucide-react';
import CharacterAvatar from './CharacterAvatar';
import NeonCard from './NeonCard';
import PixelItemCard from './PixelItemCard';
import EquipmentSlot from './EquipmentSlot';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CharacterCustomizer({ user }) {
  const queryClient = useQueryClient();
  const [localAppearance, setLocalAppearance] = useState({
    skin_tone_id: user?.skin_tone_id || 'light_pixel',
    hair_style_id: user?.hair_style_id || 'short_spiky_pixel',
    hair_color_id: user?.hair_color_id || 'blonde_pixel',
    eye_color_id: user?.eye_color_id || 'blue_pixel',
    body_type_id: user?.body_type_id || 'padrao_pixel',
    gender_preference: user?.gender_preference || 'male'
  });

  // Fetch available items
  const { data: allItems = [] } = useQuery({
    queryKey: ['allItems'],
    queryFn: () => base44.entities.Item.list()
  });

  // Filter items by unlock status and user inventory
  const unlockedItems = allItems.filter(item => 
    user?.inventory?.includes(item.item_id) || item.buy_cost === 0
  );

  const equipableItems = {
    weapon: unlockedItems.filter(i => i.type === 'weapon'),
    armor: unlockedItems.filter(i => i.type === 'armor'),
    accessory: unlockedItems.filter(i => i.type === 'accessory'),
    wing: unlockedItems.filter(i => i.type === 'wing')
  };

  // Get equipped items
  const equippedWeapon = allItems.find(i => i.item_id === user?.equipped_weapon_id);
  const equippedArmor = allItems.find(i => i.item_id === user?.equipped_armor_id);
  const equippedAccessory = allItems.find(i => i.item_id === user?.equipped_accessory_id);
  const equippedWing = allItems.find(i => i.item_id === user?.equipped_wing_id);
  const equippedHeadwear = allItems.find(i => i.item_id === user?.equipped_headwear_id);

  // Update appearance mutation
  const updateAppearance = useMutation({
    mutationFn: async (data) => {
      await base44.entities.User.update(user.id, data);
    },
    onSuccess: () => {
        queryClient.invalidateQueries(['currentUserProfile']);
        toast.success('✨ Aparência atualizada!', {
          description: '🎨 Seu herói foi customizado com sucesso',
          duration: 3000,
        });
      },
    onError: () => {
      toast.error('Erro ao atualizar aparência');
    }
  });

  // Equip item mutation
  const equipItem = useMutation({
    mutationFn: async (item) => {
      const updateData = {};
      if (item.type === 'weapon') updateData.equipped_weapon_id = item.item_id;
      if (item.type === 'armor') updateData.equipped_armor_id = item.item_id;
      if (item.type === 'accessory') updateData.equipped_accessory_id = item.item_id;
      if (item.type === 'wing') updateData.equipped_wing_id = item.item_id;
      if (item.type === 'cosmetic') updateData.equipped_headwear_id = item.item_id;

      await base44.entities.User.update(user.id, updateData);
    },
    onSuccess: (_, item) => {
        queryClient.invalidateQueries(['currentUserProfile']);
        toast.success(`⚔️ ${item.name} equipado!`, {
          description: '✅ Item adicionado ao seu personagem',
          duration: 2500,
        });
      },
    onError: () => {
      toast.error('Erro ao equipar item');
    }
  });

  // Unequip item mutation
  const unequipItem = useMutation({
    mutationFn: async (item) => {
      const updateData = {};
      if (item.type === 'weapon') updateData.equipped_weapon_id = null;
      if (item.type === 'armor') updateData.equipped_armor_id = null;
      if (item.type === 'accessory') updateData.equipped_accessory_id = null;
      if (item.type === 'wing') updateData.equipped_wing_id = null;
      if (item.type === 'cosmetic') updateData.equipped_headwear_id = null;

      await base44.entities.User.update(user.id, updateData);
    },
    onSuccess: () => {
        queryClient.invalidateQueries(['currentUserProfile']);
        toast.success('🔓 Item removido!', {
          description: '📦 Item devolvido ao inventário',
          duration: 2500,
        });
      },
    onError: () => {
      toast.error('Erro ao remover item');
    }
  });

  // Buy item mutation
  const buyItem = useMutation({
    mutationFn: async (item) => {
      if (user.gold_coins < item.buy_cost) {
        throw new Error('Gold Coins insuficientes');
      }

      const newInventory = [...(user.inventory || []), item.item_id];
      const newGold = user.gold_coins - item.buy_cost;

      await base44.entities.User.update(user.id, {
        inventory: newInventory,
        gold_coins: newGold
      });
    },
    onSuccess: (_, item) => {
        queryClient.invalidateQueries(['currentUserProfile']);
        toast.success(`🛒 ${item.name} comprado!`, {
          description: '🎉 Item adicionado ao inventário',
          duration: 3000,
        });
      },
    onError: (error) => {
      toast.error(error.message || 'Erro ao comprar item');
    }
  });

  const handleSaveAppearance = () => {
    updateAppearance.mutate(localAppearance);
  };

  // Paletas Pixel Art - IDs para assets pré-renderizados
  const skinTones = [
    { id: 'light_pixel', name: '☀️ Claro', preview: '#FFD4A3' },
    { id: 'medium_pixel', name: '🌤️ Médio', preview: '#D4A57A' },
    { id: 'tan_pixel', name: '🌅 Bronzeado', preview: '#B8835A' },
    { id: 'dark_pixel', name: '🌑 Escuro', preview: '#8B6347' }
  ];

  const hairColors = [
    { id: 'blonde_pixel', name: '⭐ Loiro', preview: '#FFE699' },
    { id: 'brown_pixel', name: '🌰 Castanho', preview: '#8B6347' },
    { id: 'black_pixel', name: '🖤 Preto', preview: '#2C2C2C' },
    { id: 'red_pixel', name: '❤️ Ruivo', preview: '#CC5555' },
    { id: 'white_pixel', name: '🤍 Branco', preview: '#F0F0F0' },
    { id: 'blue_pixel', name: '💙 Azul', preview: '#5599CC' }
  ];

  const eyeColors = [
    { id: 'blue_pixel', name: '💙 Azul', preview: '#4499DD' },
    { id: 'brown_pixel', name: '🤎 Castanho', preview: '#8B6347' },
    { id: 'green_pixel', name: '💚 Verde', preview: '#55AA77' },
    { id: 'gray_pixel', name: '🩶 Cinza', preview: '#999999' }
  ];

  const hairStyles = [
    { id: 'short_spiky_pixel', name: '⚡ Espetado (Pixel Art)', icon: '⚡' },
    { id: 'long_flowing_pixel', name: '🌊 Longo Fluido', icon: '🌊' },
    { id: 'bald_pixel', name: '💎 Careca', icon: '💎' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT COLUMN: Character Preview */}
      <NeonCard glowColor="cyan">
        <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5 text-cyan-400" />
          Visualização do Herói
        </h3>
        
        <div className="flex justify-center items-center min-h-[300px] bg-[#0a0a1a] rounded-xl border border-cyan-500/30 p-8">
          <CharacterAvatar
            skinToneId={localAppearance.skin_tone_id}
            hairStyleId={localAppearance.hair_style_id}
            hairColorId={localAppearance.hair_color_id}
            eyeColorId={localAppearance.eye_color_id}
            bodyType={localAppearance.body_type_id}
            genderPreference={localAppearance.gender_preference}
            equippedWeapon={equippedWeapon}
            equippedArmor={equippedArmor}
            equippedAccessory={equippedAccessory}
            equippedWing={equippedWing}
            equippedHeadwear={equippedHeadwear}
            size="xl"
            showGlow={true}
          />
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Arma:</span>
            <span className="text-white">{equippedWeapon?.name || 'Nenhuma'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Armadura:</span>
            <span className="text-white">{equippedArmor?.name || 'Nenhuma'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Acessório:</span>
            <span className="text-white">{equippedAccessory?.name || 'Nenhum'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Asas/Capa:</span>
            <span className="text-white">{equippedWing?.name || 'Nenhuma'}</span>
          </div>
        </div>
      </NeonCard>

      {/* RIGHT COLUMN: Customization Controls */}
      <div className="space-y-6">
        {/* Base Appearance */}
        <NeonCard glowColor="purple">
          <h3 className="text-white font-bold text-xl mb-4">Aparência Base</h3>
          
          <div className="space-y-4">
            {/* Skin Tone - Pixel Art Palettes */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">🎨 Tom de Pele (Pixel Art RPG)</label>
              <div className="grid grid-cols-2 gap-3">
                {skinTones.map(tone => (
                  <button
                    key={tone.id}
                    onClick={() => setLocalAppearance({...localAppearance, skin_tone_id: tone.id})}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 active:scale-95 ${
                      localAppearance.skin_tone_id === tone.id 
                        ? 'border-cyan-400 bg-cyan-500/20 scale-105 shadow-[0_0_15px_rgba(0,255,255,0.4)]' 
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded border-2 border-black"
                      style={{ backgroundColor: tone.preview, imageRendering: 'pixelated' }}
                    />
                    <span className="text-white text-sm font-semibold">{tone.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Color - Pixel Art */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">💇 Cor do Cabelo (Pixel Art)</label>
              <div className="grid grid-cols-3 gap-2">
                {hairColors.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setLocalAppearance({...localAppearance, hair_color_id: color.id})}
                    className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 active:scale-90 ${
                      localAppearance.hair_color_id === color.id 
                        ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,255,255,0.4)]' 
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                    }`}
                  >
                    <div 
                      className="w-full h-8 rounded border-2 border-black"
                      style={{ backgroundColor: color.preview, imageRendering: 'pixelated' }}
                    />
                    <span className="text-white text-xs">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Eye Color - Pixel Art */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">👁️ Cor dos Olhos (Pixel Art)</label>
              <div className="grid grid-cols-2 gap-3">
                {eyeColors.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setLocalAppearance({...localAppearance, eye_color_id: color.id})}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 active:scale-95 ${
                      localAppearance.eye_color_id === color.id 
                        ? 'border-cyan-400 bg-cyan-500/20 scale-105 shadow-[0_0_15px_rgba(0,255,255,0.4)]' 
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-black"
                      style={{ backgroundColor: color.preview, imageRendering: 'pixelated' }}
                    />
                    <span className="text-white text-sm font-semibold">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Style - Pixel Art RPG */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">✂️ Estilo de Cabelo (Pixel Art RPG)</label>
              <div className="grid grid-cols-1 gap-2">
                {hairStyles.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setLocalAppearance({...localAppearance, hair_style_id: style.id})}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 active:scale-95 ${
                      localAppearance.hair_style_id === style.id 
                        ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,255,255,0.4)]' 
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                    }`}
                  >
                    <span className="text-2xl">{style.icon}</span>
                    <span className="text-white font-semibold">{style.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body Type - Pixel Art */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">🧍 Tipo Corporal (Pixel Art)</label>
              <Select 
                value={localAppearance.body_type_id}
                onValueChange={(value) => setLocalAppearance({...localAppearance, body_type_id: value})}
              >
                <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="esbelto_pixel">Esbelto Pixel</SelectItem>
                  <SelectItem value="padrao_pixel">Padrão Pixel</SelectItem>
                  <SelectItem value="musculoso_pixel">Musculoso Pixel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender Preference */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">⚧️ Gênero do Personagem</label>
              <Select 
                value={localAppearance.gender_preference}
                onValueChange={(value) => setLocalAppearance({...localAppearance, gender_preference: value})}
              >
                <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">♂️ Masculino</SelectItem>
                  <SelectItem value="female">♀️ Feminino</SelectItem>
                  <SelectItem value="non-binary">⚧️ Não-Binário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSaveAppearance}
              disabled={updateAppearance.isPending}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
            >
              {updateAppearance.isPending ? 'Salvando...' : 'Salvar Aparência'}
            </Button>
          </div>
        </NeonCard>

        {/* Equipment Slots - Drag & Drop */}
        <NeonCard glowColor="magenta">
          <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-magenta-400" />
            Slots de Equipamento
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <EquipmentSlot
              type="weapon"
              equippedItem={equippedWeapon}
              onEquip={(item) => equipItem.mutate(item)}
              onUnequip={(item) => unequipItem.mutate(item)}
            />
            <EquipmentSlot
              type="armor"
              equippedItem={equippedArmor}
              onEquip={(item) => equipItem.mutate(item)}
              onUnequip={(item) => unequipItem.mutate(item)}
            />
            <EquipmentSlot
              type="accessory"
              equippedItem={equippedAccessory}
              onEquip={(item) => equipItem.mutate(item)}
              onUnequip={(item) => unequipItem.mutate(item)}
            />
            <EquipmentSlot
              type="wing"
              equippedItem={equippedWing}
              onEquip={(item) => equipItem.mutate(item)}
              onUnequip={(item) => unequipItem.mutate(item)}
            />
          </div>
        </NeonCard>

        {/* Inventory - Detailed View */}
        <NeonCard glowColor="cyan">
          <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Inventário
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Arraste os itens para os slots acima para equipá-los
          </p>

          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {unlockedItems.map(item => (
              <PixelItemCard
                key={item.item_id}
                item={item}
                isEquipped={
                  user?.equipped_weapon_id === item.item_id ||
                  user?.equipped_armor_id === item.item_id ||
                  user?.equipped_accessory_id === item.item_id ||
                  user?.equipped_wing_id === item.item_id ||
                  user?.equipped_headwear_id === item.item_id
                }
                onEquip={(item) => equipItem.mutate(item)}
                onUnequip={(item) => unequipItem.mutate(item)}
                userGold={user?.gold_coins || 0}
                draggable={true}
              />
            ))}
            {unlockedItems.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Inventário vazio</p>
                <p className="text-xs mt-1">Compre itens na loja abaixo</p>
              </div>
            )}
          </div>
        </NeonCard>

        {/* Item Shop */}
        <NeonCard glowColor="gold">
          <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-yellow-400" />
            Loja de Itens Pixel Art
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Gold Coins disponíveis: <span className="text-yellow-400 font-bold">{user?.gold_coins || 0}</span>
          </p>

          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {allItems.filter(item => 
              item.buy_cost > 0 && !user?.inventory?.includes(item.item_id)
            ).map(item => (
              <PixelItemCard
                key={item.item_id}
                item={item}
                isEquipped={false}
                onBuy={(item) => buyItem.mutate(item)}
                userGold={user?.gold_coins || 0}
                draggable={false}
              />
            ))}
          </div>
        </NeonCard>
      </div>
    </div>
  );
}