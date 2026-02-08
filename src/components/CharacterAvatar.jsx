import { cn } from '@/lib/utils';

// Keyframe animations for pixel art character
const animations = `
  @keyframes idle-breathe {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-2px); }
  }
  
  @keyframes blink {
    0%, 90%, 100% { opacity: 0; }
    95% { opacity: 1; }
  }
  
  @keyframes sway {
    0%, 100% { transform: rotate(-0.5deg); }
    50% { transform: rotate(0.5deg); }
  }
  
  @keyframes wing-flap {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-4px) rotate(-3deg); }
  }
  
  @keyframes hair-flow {
    0%, 100% { transform: translateX(0px); }
    50% { transform: translateX(1px); }
  }
`;

// Pixel Art Color Palettes
const skinTones = {
  light_pixel: ['#FFD4A3', '#FFCB8E', '#FFB885'],
  medium_pixel: ['#D4A57A', '#C69463', '#B8835A'],
  tan_pixel: ['#B8835A', '#A67548', '#946741'],
  dark_pixel: ['#8B6347', '#7A543E', '#6B4836']
};

const hairColors = {
  blonde_pixel: ['#FFE699', '#FFD966', '#FFC933'],
  brown_pixel: ['#8B6347', '#7A543E', '#6B4836'],
  black_pixel: ['#2C2C2C', '#1F1F1F', '#121212'],
  red_pixel: ['#CC5555', '#B34444', '#993333'],
  white_pixel: ['#F0F0F0', '#DDDDDD', '#CCCCCC'],
  blue_pixel: ['#5599CC', '#4488BB', '#3377AA']
};

const eyeColors = {
  blue_pixel: ['#4499DD', '#3377BB', '#225599'],
  brown_pixel: ['#8B6347', '#7A543E', '#6B4836'],
  green_pixel: ['#55AA77', '#449966', '#338855'],
  gray_pixel: ['#999999', '#888888', '#777777']
};

export default function CharacterAvatar({ 
  skinToneId = 'light_pixel', 
  hairStyleId = 'short_spiky_pixel',
  hairColorId = 'blonde_pixel',
  eyeColorId = 'blue_pixel',
  bodyType = 'padrao_pixel',
  genderPreference = 'male',
  equippedWeapon,
  equippedArmor,
  equippedAccessory,
  equippedWing,
  equippedHeadwear,
  size = 'md',
  showGlow = false,
  className 
}) {
  const sizeClasses = {
    sm: 'w-24 h-28',
    md: 'w-32 h-36',
    lg: 'w-40 h-48',
    xl: 'w-56 h-72'
  };

  const pixelSize = size === 'xl' ? 4 : size === 'lg' ? 3 : size === 'md' ? 2 : 1.5;
  
  const skin = skinTones[skinToneId] || skinTones.light_pixel;
  const hair = hairColors[hairColorId] || hairColors.blonde_pixel;
  const eyes = eyeColors[eyeColorId] || eyeColors.blue_pixel;

  return (
    <>
      <style>{animations}</style>
      <div className={cn(
        'relative flex items-center justify-center',
        sizeClasses[size],
        className
      )}
      style={{ imageRendering: 'pixelated' }}
      >
        {/* Glow Effect */}
        {showGlow && (
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-magenta-400/20 to-cyan-400/20 blur-xl" />
        )}

        {/* PIXEL ART CHARACTER */}
        <div 
          className="relative z-10 flex flex-col items-center justify-center" 
          style={{ 
            imageRendering: 'pixelated',
            animation: 'sway 5s ease-in-out infinite'
          }}
        >
          {/* Wing/Cape (Background) */}
          {equippedWing && (
            <div 
              className="absolute -top-12 left-1/2 -translate-x-1/2 -z-10"
              style={{ animation: 'wing-flap 2.5s ease-in-out infinite' }}
            >
              <span className="text-6xl drop-shadow-[0_0_15px_rgba(57,255,20,0.6)]">
                {equippedWing.icon || '👼'}
              </span>
            </div>
          )}

          {/* Character Body Container */}
          <div 
            className="relative flex flex-col items-center"
            style={{ animation: 'idle-breathe 3.5s ease-in-out infinite' }}
          >
            {/* HEAD - Pixel Art RPG Style (Large Anime Eyes) */}
            <div 
              className="relative"
              style={{ 
                width: size === 'xl' ? '100px' : size === 'lg' ? '75px' : size === 'md' ? '50px' : '38px',
                height: size === 'xl' ? '100px' : size === 'lg' ? '75px' : size === 'md' ? '50px' : '38px'
              }}
            >
              {/* Head Base with Pixel Art Shading */}
              <div className="absolute inset-0">
                {/* Main head color */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: skin[0] }}
                />
                {/* Shading - left side */}
                <div 
                  className="absolute left-0 top-2 bottom-2 w-1/4 rounded-l-full"
                  style={{ backgroundColor: skin[1], opacity: 0.6 }}
                />
                {/* Shading - bottom */}
                <div 
                  className="absolute left-2 right-2 bottom-0 h-1/4 rounded-b-full"
                  style={{ backgroundColor: skin[2], opacity: 0.4 }}
                />
              </div>

              {/* Hair - Pixel Art with Volume */}
              <div 
                className="absolute -top-3 left-0 right-0"
                style={{ 
                  animation: 'hair-flow 3s ease-in-out infinite',
                  height: size === 'xl' ? '50px' : size === 'lg' ? '40px' : size === 'md' ? '28px' : '22px'
                }}
              >
                {hairStyleId === 'short_spiky_pixel' && (
                  <>
                    {/* Espetado - Wild Spiky Pixel Art (reference style) */}
                    <div className="absolute inset-0">
                      {/* Base hair volume - rounded bottom */}
                      <div 
                        className="absolute bottom-0 left-1/2 -translate-x-1/2"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '100%',
                          height: '55%',
                          borderRadius: '50% 50% 0 0'
                        }}
                      />

                      {/* Multiple layers of spikes for volume */}
                      {/* Back layer - larger spikes */}
                      <div 
                        className="absolute top-0 left-0 rounded-t-lg"
                        style={{ 
                          backgroundColor: hair[1],
                          width: '25%',
                          height: '50%',
                          transform: 'rotate(-35deg) translateX(-8px)',
                          opacity: 0.8
                        }}
                      />
                      <div 
                        className="absolute top-0 right-0 rounded-t-lg"
                        style={{ 
                          backgroundColor: hair[1],
                          width: '25%',
                          height: '50%',
                          transform: 'rotate(35deg) translateX(8px)',
                          opacity: 0.8
                        }}
                      />

                      {/* Front spikes - main layer */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-end justify-center gap-px" style={{ width: '90%', height: '70%' }}>
                        {/* Far left spike */}
                        <div 
                          className="rounded-t"
                          style={{ 
                            backgroundColor: hair[0],
                            width: '16%',
                            height: '65%',
                            transform: 'rotate(-30deg)',
                            boxShadow: `inset -2px 0 0 ${hair[2]}`
                          }}
                        />

                        {/* Left spike */}
                        <div 
                          className="rounded-t"
                          style={{ 
                            backgroundColor: hair[0],
                            width: '18%',
                            height: '80%',
                            transform: 'rotate(-15deg)',
                            boxShadow: `inset -1px 0 0 ${hair[1]}`
                          }}
                        />

                        {/* Left-center spike */}
                        <div 
                          className="rounded-t"
                          style={{ 
                            backgroundColor: hair[0],
                            width: '16%',
                            height: '90%',
                            transform: 'rotate(-5deg)',
                            boxShadow: `inset 1px 0 0 rgba(255,255,255,0.2)`
                          }}
                        />

                        {/* Center spike - tallest */}
                        <div 
                          className="rounded-t"
                          style={{ 
                            backgroundColor: hair[0],
                            width: '18%',
                            height: '100%',
                            boxShadow: `inset 2px 0 0 rgba(255,255,255,0.3), inset -1px 0 0 ${hair[1]}`
                          }}
                        />

                        {/* Right-center spike */}
                        <div 
                          className="rounded-t"
                          style={{ 
                            backgroundColor: hair[0],
                            width: '16%',
                            height: '90%',
                            transform: 'rotate(5deg)',
                            boxShadow: `inset -1px 0 0 rgba(255,255,255,0.2)`
                          }}
                        />

                        {/* Right spike */}
                        <div 
                          className="rounded-t"
                          style={{ 
                            backgroundColor: hair[0],
                            width: '18%',
                            height: '80%',
                            transform: 'rotate(15deg)',
                            boxShadow: `inset 1px 0 0 ${hair[1]}`
                          }}
                        />

                        {/* Far right spike */}
                        <div 
                          className="rounded-t"
                          style={{ 
                            backgroundColor: hair[0],
                            width: '16%',
                            height: '65%',
                            transform: 'rotate(30deg)',
                            boxShadow: `inset 2px 0 0 ${hair[2]}`
                          }}
                        />
                      </div>

                      {/* Additional small spikes for chaos */}
                      <div 
                        className="absolute top-2 left-1/4 rounded-t"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '12%',
                          height: '35%',
                          transform: 'rotate(-10deg)'
                        }}
                      />
                      <div 
                        className="absolute top-2 right-1/4 rounded-t"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '12%',
                          height: '35%',
                          transform: 'rotate(10deg)'
                        }}
                      />

                      {/* Side volume chunks */}
                      <div 
                        className="absolute top-1/3 left-0 rounded-l-lg"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '20%',
                          height: '40%',
                          boxShadow: `inset 3px 0 0 ${hair[2]}`
                        }}
                      />
                      <div 
                        className="absolute top-1/3 right-0 rounded-r-lg"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '20%',
                          height: '40%',
                          boxShadow: `inset -3px 0 0 ${hair[2]}`
                        }}
                      />

                      {/* Highlight on top spike */}
                      <div 
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-3 rounded opacity-40"
                        style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                      />
                    </div>
                  </>
                )}

                {hairStyleId === 'long_flowing_pixel' && (
                  <>
                    {/* Longo Fluido - Long Pixel Art Hair (anime style) */}
                    <div className="absolute inset-0">
                      {/* Top rounded volume - covers top of head */}
                      <div 
                        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-t-full"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '90%',
                          height: '50%',
                          boxShadow: `inset 0 2px 0 rgba(255,255,255,0.2)`
                        }}
                      />

                      {/* Hair cap base - connects to head */}
                      <div 
                        className="absolute bottom-0 left-1/2 -translate-x-1/2"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '100%',
                          height: '60%',
                          borderRadius: '50% 50% 0 0'
                        }}
                      />

                      {/* Center bangs - triangular pixel cuts */}
                      <div 
                        className="absolute top-1/3 left-1/2 -translate-x-1/2"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '30%',
                          height: '40%',
                          clipPath: 'polygon(50% 0%, 30% 60%, 40% 100%, 60% 100%, 70% 60%)'
                        }}
                      />

                      {/* Left side long strand - pixel stepped edges */}
                      <div 
                        className="absolute left-0 top-1/4"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '35%',
                          height: '140%',
                          clipPath: 'polygon(0% 0%, 85% 5%, 75% 100%, 0% 95%)',
                          boxShadow: `inset 4px 0 0 ${hair[2]}`
                        }}
                      />

                      {/* Right side long strand - pixel stepped edges */}
                      <div 
                        className="absolute right-0 top-1/4"
                        style={{ 
                          backgroundColor: hair[0],
                          width: '35%',
                          height: '140%',
                          clipPath: 'polygon(15% 5%, 100% 0%, 100% 95%, 25% 100%)',
                          boxShadow: `inset -4px 0 0 ${hair[2]}`
                        }}
                      />

                      {/* Inner shadow layers for depth */}
                      <div 
                        className="absolute left-1/4 top-1/2 w-1/4 h-1/3 opacity-20"
                        style={{ 
                          backgroundColor: hair[2],
                          clipPath: 'ellipse(50% 60% at 50% 50%)'
                        }}
                      />

                      {/* Highlight shine - top center */}
                      <div 
                        className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full"
                        style={{ 
                          backgroundColor: 'rgba(255,255,255,0.35)',
                          width: '30%',
                          height: '15%'
                        }}
                      />

                      {/* Pixel details - small lighter strands */}
                      <div 
                        className="absolute left-1/3 top-1/4 w-1 opacity-40"
                        style={{ 
                          backgroundColor: 'rgba(255,255,255,0.6)',
                          height: '30%'
                        }}
                      />
                      <div 
                        className="absolute right-1/3 top-1/4 w-1 opacity-40"
                        style={{ 
                          backgroundColor: 'rgba(255,255,255,0.6)',
                          height: '30%'
                        }}
                      />
                    </div>
                  </>
                )}

                {hairStyleId === 'bald_pixel' && (
                  <>
                    {/* Careca - Bald Head (no hair, just head shine) */}
                    <div className="absolute inset-0">
                      {/* Subtle shine on top of head */}
                      <div 
                        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                        style={{ 
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          width: '40%',
                          height: '30%'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Headwear */}
              {equippedHeadwear && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                  {equippedHeadwear.icon || '👑'}
                </div>
              )}

              {/* Eyes - Large Anime Pixel Art Style */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 flex gap-1.5">
                {/* Left Eye */}
                <div 
                  className="relative" 
                  style={{ 
                    width: size === 'xl' ? '20px' : size === 'lg' ? '16px' : size === 'md' ? '12px' : '9px',
                    height: size === 'xl' ? '24px' : size === 'lg' ? '18px' : size === 'md' ? '14px' : '11px'
                  }}
                >
                  {/* Eye white */}
                  <div className="absolute inset-0 bg-white rounded-full" />
                  {/* Iris */}
                  <div 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{ 
                      backgroundColor: eyes[0],
                      width: '75%',
                      height: '60%'
                    }}
                  />
                  {/* Pupil */}
                  <div 
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-black"
                    style={{ 
                      width: '40%',
                      height: '35%'
                    }}
                  />
                  {/* Shine - pixel style */}
                  <div 
                    className="absolute top-1 left-0.5 bg-white rounded-sm"
                    style={{ 
                      width: size === 'xl' ? '6px' : '4px',
                      height: size === 'xl' ? '6px' : '4px'
                    }}
                  />
                  <div 
                    className="absolute bottom-1 right-0.5 bg-white rounded-sm opacity-50"
                    style={{ 
                      width: size === 'xl' ? '3px' : '2px',
                      height: size === 'xl' ? '3px' : '2px'
                    }}
                  />
                  {/* Eyelid for blink */}
                  <div 
                    className="absolute inset-0 bg-black rounded-full"
                    style={{ 
                      animation: 'blink 5s ease-in-out infinite',
                      transformOrigin: 'center top'
                    }}
                  />
                </div>

                {/* Right Eye */}
                <div 
                  className="relative" 
                  style={{ 
                    width: size === 'xl' ? '20px' : size === 'lg' ? '16px' : size === 'md' ? '12px' : '9px',
                    height: size === 'xl' ? '24px' : size === 'lg' ? '18px' : size === 'md' ? '14px' : '11px'
                  }}
                >
                  <div className="absolute inset-0 bg-white rounded-full" />
                  <div 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{ 
                      backgroundColor: eyes[0],
                      width: '75%',
                      height: '60%'
                    }}
                  />
                  <div 
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-black"
                    style={{ 
                      width: '40%',
                      height: '35%'
                    }}
                  />
                  <div 
                    className="absolute top-1 left-0.5 bg-white rounded-sm"
                    style={{ 
                      width: size === 'xl' ? '6px' : '4px',
                      height: size === 'xl' ? '6px' : '4px'
                    }}
                  />
                  <div 
                    className="absolute bottom-1 right-0.5 bg-white rounded-sm opacity-50"
                    style={{ 
                      width: size === 'xl' ? '3px' : '2px',
                      height: size === 'xl' ? '3px' : '2px'
                    }}
                  />
                  <div 
                    className="absolute inset-0 bg-black rounded-full"
                    style={{ 
                      animation: 'blink 5s ease-in-out infinite',
                      transformOrigin: 'center top'
                    }}
                  />
                </div>
              </div>

              {/* Mouth - Simple pixel art smile */}
              <div 
                className="absolute bottom-3 left-1/2 -translate-x-1/2"
                style={{ 
                  width: size === 'xl' ? '12px' : '8px',
                  height: size === 'xl' ? '6px' : '4px',
                  borderBottom: `${pixelSize}px solid #333`,
                  borderRadius: '0 0 50% 50%'
                }}
              />

              {/* Cheek blush - pixel art */}
              <div 
                className="absolute bottom-6 left-1 bg-pink-400 opacity-40 rounded-full"
                style={{ 
                  width: size === 'xl' ? '8px' : '6px',
                  height: size === 'xl' ? '6px' : '4px'
                }}
              />
              <div 
                className="absolute bottom-6 right-1 bg-pink-400 opacity-40 rounded-full"
                style={{ 
                  width: size === 'xl' ? '8px' : '6px',
                  height: size === 'xl' ? '6px' : '4px'
                }}
              />
            </div>

            {/* BODY - Pixel Art Armor/Clothing */}
            <div 
              className="relative -mt-2"
              style={{ 
                width: size === 'xl' ? '70px' : size === 'lg' ? '55px' : size === 'md' ? '36px' : '28px',
                height: size === 'xl' ? '50px' : size === 'lg' ? '40px' : size === 'md' ? '26px' : '20px'
              }}
            >
              {/* Armor/Clothing Base */}
              <div 
                className="absolute inset-0 rounded-lg"
                style={{ backgroundColor: equippedArmor?.color || '#CC3333' }}
              />
              {/* Armor Shading */}
              <div 
                className="absolute left-0 top-1 bottom-1 w-1/4 rounded-l-lg opacity-30"
                style={{ backgroundColor: '#000' }}
              />
              
              {/* Armor Icon/Details */}
              {equippedArmor && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    {equippedArmor.icon || '🛡️'}
                  </span>
                </div>
              )}

              {/* Arms */}
              <div 
                className="absolute -left-1 top-1"
                style={{ 
                  width: size === 'xl' ? '12px' : '8px',
                  height: size === 'xl' ? '20px' : '14px',
                  backgroundColor: skin[0],
                  borderRadius: '4px'
                }}
              />
              <div 
                className="absolute -right-1 top-1"
                style={{ 
                  width: size === 'xl' ? '12px' : '8px',
                  height: size === 'xl' ? '20px' : '14px',
                  backgroundColor: skin[0],
                  borderRadius: '4px'
                }}
              />
            </div>

            {/* LEGS - Pixel Art */}
            <div className="flex gap-1 -mt-1">
              <div 
                className="rounded-b-md"
                style={{ 
                  width: size === 'xl' ? '18px' : '12px',
                  height: size === 'xl' ? '24px' : '16px',
                  backgroundColor: '#5588BB'
                }}
              />
              <div 
                className="rounded-b-md"
                style={{ 
                  width: size === 'xl' ? '18px' : '12px',
                  height: size === 'xl' ? '24px' : '16px',
                  backgroundColor: '#5588BB'
                }}
              />
            </div>

            {/* Shadow */}
            <div 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black opacity-20 rounded-full blur-sm"
              style={{ 
                width: size === 'xl' ? '50px' : '30px',
                height: size === 'xl' ? '6px' : '4px'
              }}
            />
          </div>

          {/* Weapon - Pixel Art Style */}
          {equippedWeapon && (
            <div 
              className="absolute -right-8 top-1/3 text-5xl"
              style={{ 
                transform: 'rotate(170deg)',
                filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.5))'
              }}
            >
              {equippedWeapon.icon || '⚔️'}
            </div>
          )}

          {/* Accessory */}
          {equippedAccessory && (
            <div 
              className="absolute -top-4 -right-4 text-3xl"
              style={{ animation: 'wing-flap 3s ease-in-out infinite' }}
            >
              {equippedAccessory.icon || '💍'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}