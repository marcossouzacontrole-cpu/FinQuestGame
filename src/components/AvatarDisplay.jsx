import { cn } from '@/lib/utils';

export default function AvatarDisplay({ user, size = 'md', showEquipment = false, className }) {
  const sizes = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-32 h-32 text-4xl'
  };

  const sizeClass = sizes[size] || sizes.md;

  // If user has custom avatar image
  if (user?.use_custom_avatar && user?.avatar_image_url) {
    return (
      <div className={cn("relative", className)}>
        <div className={cn(
          sizeClass,
          "rounded-full overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(0,255,255,0.3)]"
        )}>
          <img 
            src={user.avatar_image_url} 
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        {showEquipment && user.equipped_headwear && (
          <div className="absolute -top-2 -right-2 text-2xl">👑</div>
        )}
      </div>
    );
  }

  // Generate avatar based on customization
  const getSkinToneColor = () => {
    const tones = {
      light: '#FFE4C4',
      medium_light: '#FDBCB4',
      medium: '#D2A679',
      medium_dark: '#A67C52',
      dark: '#5C4033'
    };
    return tones[user?.skin_tone] || tones.medium;
  };

  const getHairColor = () => {
    const colors = {
      black: '#000000',
      brown: '#4A3C31',
      blonde: '#F5DEB3',
      red: '#B94E48',
      gray: '#808080',
      white: '#F5F5F5',
      blue: '#00FFFF',
      pink: '#FF00FF',
      green: '#39FF14',
      purple: '#8A2BE2'
    };
    return colors[user?.hair_color] || colors.brown;
  };

  const getEyeEmoji = () => {
    const eyes = {
      brown: '👁️',
      blue: '💙',
      green: '💚',
      hazel: '🟤',
      gray: '⚫',
      amber: '🟠'
    };
    return eyes[user?.eye_color] || eyes.brown;
  };

  const getBodyEmoji = () => {
    const body = {
      slim: '🧍',
      athletic: '🏃',
      muscular: '💪',
      curvy: '🧍‍♀️'
    };
    return body[user?.body_type] || body.athletic;
  };

  const getGenderEmoji = () => {
    const gender = {
      male: '👨',
      female: '👩',
      non_binary: '🧑'
    };
    return gender[user?.gender] || gender.male;
  };

  // Generated avatar
  return (
    <div className={cn("relative", className)}>
      <div 
        className={cn(
          sizeClass,
          "rounded-full flex items-center justify-center font-bold border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(0,255,255,0.3)] overflow-hidden"
        )}
        style={{ 
          background: `linear-gradient(135deg, ${getSkinToneColor()}, ${user?.avatar_color || '#FF00FF'})` 
        }}
      >
        {user?.full_name ? (
          <span className="text-white drop-shadow-lg">{user.full_name.charAt(0).toUpperCase()}</span>
        ) : (
          <span className="text-white drop-shadow-lg">?</span>
        )}
      </div>
      
      {showEquipment && (
        <div className="absolute -bottom-1 -right-1 flex gap-1">
          {user?.equipped_weapon && <div className="text-lg">⚔️</div>}
          {user?.equipped_armor && <div className="text-lg">🛡️</div>}
          {user?.equipped_accessory && <div className="text-lg">💎</div>}
        </div>
      )}
    </div>
  );
}