import NeonCard from './NeonCard';
import CharacterAvatar from './CharacterAvatar';

/**
 * DOCUMENTAÇÃO DO SISTEMA DE PIXEL ART RPG
 * 
 * Este componente documenta a implementação completa do sistema de personalização
 * de personagens em Pixel Art no estilo RPG clássico.
 * 
 * CARACTERÍSTICAS PRINCIPAIS:
 * 
 * 1. PALETAS DE CORES PRÉ-DEFINIDAS
 *    - Cada característica (pele, cabelo, olhos) usa IDs que apontam para paletas pixel art
 *    - As paletas incluem múltiplas tonalidades para sombreamento (light, mid, dark)
 *    - Todas as cores são chapadas (flat) sem gradientes suaves
 * 
 * 2. RENDERIZAÇÃO PIXEL-PERFECT
 *    - CSS: imageRendering: 'pixelated' para manter a estética pixelizada
 *    - Sprites escalados sem suavização (anti-aliasing desativado)
 *    - Dimensões baseadas em múltiplos de pixels para consistência
 * 
 * 3. SISTEMA DE CAMADAS
 *    - Corpo base (pele, formato)
 *    - Cabelo (com estilos variados)
 *    - Olhos (estilo anime grande com pixel art)
 *    - Equipamentos (arma, armadura, asas, acessórios)
 * 
 * 4. ANIMAÇÕES 2D SUTIS
 *    - Respiração idle (breathing)
 *    - Piscar de olhos (blinking)
 *    - Balanço suave (sway)
 *    - Movimento de asas (wing-flap)
 * 
 * 5. MODELAGEM DE DADOS
 *    - User.skin_tone_id: ID da paleta de tom de pele
 *    - User.hair_style_id: ID do estilo de cabelo
 *    - User.hair_color_id: ID da cor do cabelo
 *    - User.eye_color_id: ID da cor dos olhos
 *    - User.body_type_id: ID do tipo corporal
 *    - User.equipped_*_id: IDs dos itens equipados
 * 
 * 6. ITENS PIXEL ART
 *    - Cada item tem visual_asset_url apontando para sprite/emoji
 *    - Cores temáticas que harmonizam com o estilo retro
 *    - Raridades visuais (common, rare, epic, legendary)
 * 
 * REFERÊNCIA DE ARTE:
 * O estilo segue rigorosamente o padrão de Pixel Art de RPGs clássicos:
 * - Cabeças grandes (estilo chibi/anime)
 * - Olhos expressivos com múltiplas camadas de pixel art
 * - Sombreamento feito com cores sólidas escalonadas
 * - Proporções: cabeça ≈ 40%, corpo ≈ 35%, pernas ≈ 25%
 * - Detalhamento nos pixels para cabelo (volume, textura)
 * - Equipamentos com visual destacado e cores vibrantes
 */

export default function PixelArtDocumentation() {
  const examples = [
    {
      title: "Guerreiro Loiro",
      props: {
        skinToneId: 'light_pixel',
        hairStyleId: 'short_spiky_pixel',
        hairColorId: 'blonde_pixel',
        eyeColorId: 'blue_pixel',
        bodyType: 'musculoso_pixel'
      }
    },
    {
      title: "Mago Moreno",
      props: {
        skinToneId: 'medium_pixel',
        hairStyleId: 'long_flowing_pixel',
        hairColorId: 'brown_pixel',
        eyeColorId: 'green_pixel',
        bodyType: 'esbelto_pixel'
      }
    },
    {
      title: "Gatuno de Cabelo Escuro",
      props: {
        skinToneId: 'tan_pixel',
        hairStyleId: 'short_messy_pixel',
        hairColorId: 'black_pixel',
        eyeColorId: 'gray_pixel',
        bodyType: 'padrao_pixel'
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <NeonCard glowColor="cyan">
        <h1 className="text-3xl font-bold text-white mb-4">
          📚 Documentação: Sistema Pixel Art RPG
        </h1>
        <p className="text-gray-300 mb-4">
          Sistema completo de personalização de personagens em Pixel Art, seguindo o estilo 
          de RPGs clássicos com cabeças grandes, olhos anime expressivos e equipamentos detalhados.
        </p>
        
        <div className="bg-[#0a0a1a] rounded-lg p-4 border border-cyan-500/30">
          <h3 className="text-cyan-400 font-bold mb-2">✅ Implementado:</h3>
          <ul className="text-gray-300 space-y-1 text-sm">
            <li>• Paletas de cores pré-definidas (4 tons de pele, 6 cores de cabelo, 4 cores de olhos)</li>
            <li>• Renderização pixel-perfect com CSS imageRendering: 'pixelated'</li>
            <li>• Sistema de camadas para sobreposição de sprites</li>
            <li>• Animações 2D sutis (breathing, blinking, sway, wing-flap)</li>
            <li>• Entidade User atualizada com campos baseados em IDs</li>
            <li>• Interface de customização com preview ao vivo</li>
            <li>• Catálogo de itens Pixel Art (8 itens de exemplo criados)</li>
          </ul>
        </div>
      </NeonCard>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Exemplos de Personagens</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {examples.map((example, idx) => (
            <NeonCard key={idx} glowColor="magenta">
              <h3 className="text-white font-bold mb-4 text-center">{example.title}</h3>
              <div className="flex justify-center py-4">
                <CharacterAvatar
                  {...example.props}
                  size="lg"
                  showGlow={true}
                />
              </div>
              <div className="text-xs text-gray-400 mt-4 space-y-1">
                <div>Pele: {example.props.skinToneId}</div>
                <div>Cabelo: {example.props.hairStyleId}</div>
                <div>Cor: {example.props.hairColorId}</div>
                <div>Olhos: {example.props.eyeColorId}</div>
              </div>
            </NeonCard>
          ))}
        </div>
      </div>

      <NeonCard glowColor="purple">
        <h2 className="text-2xl font-bold text-white mb-4">
          🎨 Direcionamento de Arte
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
          <div>
            <h3 className="text-cyan-400 font-bold mb-2">Proporções do Personagem</h3>
            <ul className="space-y-1 text-sm">
              <li>• Cabeça: 40% do sprite (grande, estilo chibi)</li>
              <li>• Corpo: 35% do sprite</li>
              <li>• Pernas: 25% do sprite (curtas, estilo SD)</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-magenta-400 font-bold mb-2">Estilo Visual</h3>
            <ul className="space-y-1 text-sm">
              <li>• Olhos grandes estilo anime (múltiplas camadas)</li>
              <li>• Sombreamento com 3 tons por característica</li>
              <li>• Cores chapadas (flat) sem gradientes</li>
              <li>• Detalhe pixelado no cabelo</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-green-400 font-bold mb-2">Equipamentos</h3>
            <ul className="space-y-1 text-sm">
              <li>• Armas oversized (45° de rotação)</li>
              <li>• Armaduras com cores temáticas vibrantes</li>
              <li>• Asas com animação de flap</li>
              <li>• Acessórios flutuantes</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-purple-400 font-bold mb-2">Animações</h3>
            <ul className="space-y-1 text-sm">
              <li>• Idle breathing: 3.5s ease-in-out</li>
              <li>• Eye blinking: 5s (95% do tempo aberto)</li>
              <li>• Character sway: 5s lateral</li>
              <li>• Wing flap: 2.5s up/down</li>
            </ul>
          </div>
        </div>
      </NeonCard>

      <NeonCard glowColor="green">
        <h2 className="text-2xl font-bold text-white mb-4">
          💾 Estrutura de Dados
        </h2>
        <div className="bg-[#0a0a1a] rounded-lg p-4 border border-green-500/30">
          <pre className="text-green-400 text-xs overflow-x-auto">
{`// User Entity - Campos de Aparência Pixel Art
{
  "skin_tone_id": "light_pixel" | "medium_pixel" | "tan_pixel" | "dark_pixel",
  "hair_style_id": "short_spiky_pixel" | "long_flowing_pixel" | "short_messy_pixel",
  "hair_color_id": "blonde_pixel" | "brown_pixel" | "black_pixel" | "red_pixel" | "white_pixel" | "blue_pixel",
  "eye_color_id": "blue_pixel" | "brown_pixel" | "green_pixel" | "gray_pixel",
  "body_type_id": "esbelto_pixel" | "padrao_pixel" | "musculoso_pixel",
  "gender_preference": "male" | "female" | "non-binary",
  "equipped_weapon_id": "string",
  "equipped_armor_id": "string",
  "equipped_accessory_id": "string",
  "equipped_wing_id": "string",
  "equipped_headwear_id": "string"
}

// Item Entity - Equipamentos Pixel Art
{
  "item_id": "string",
  "name": "string",
  "type": "weapon" | "armor" | "accessory" | "wing" | "headwear" | "cosmetic",
  "visual_asset_url": "string", // Sprite URL ou emoji
  "icon": "string", // Emoji para UI
  "rarity": "common" | "rare" | "epic" | "legendary",
  "color": "#HEX", // Cor temática pixel art
  "buy_cost": number,
  "financial_stat_bonus": number
}`}
          </pre>
        </div>
      </NeonCard>
    </div>
  );
}