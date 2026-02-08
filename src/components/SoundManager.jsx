// Sistema de áudio do FinQuest
const sounds = {
  xp: { url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', volume: 0.3 },
  levelup: { url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', volume: 0.4 },
  coin: { url: 'https://assets.mixkit.co/active_storage/sfx/1993/1993-preview.mp3', volume: 0.3 },
  mission: { url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', volume: 0.4 },
  error: { url: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3', volume: 0.2 },
  success: { url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', volume: 0.3 },
};

const audioCache = {};
let isSoundEnabled = true;

export function initSound(name) {
  if (!sounds[name] || audioCache[name]) return;
  
  const audio = new Audio(sounds[name].url);
  audio.volume = sounds[name].volume;
  audio.preload = 'auto';
  audioCache[name] = audio;
}

export function playSound(name) {
  if (!isSoundEnabled) return;
  
  if (!audioCache[name]) {
    initSound(name);
  }
  
  const audio = audioCache[name];
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

export function toggleSound() {
  isSoundEnabled = !isSoundEnabled;
  return isSoundEnabled;
}

export function isSoundOn() {
  return isSoundEnabled;
}

// Pré-carregar sons importantes
if (typeof window !== 'undefined') {
  ['xp', 'levelup', 'coin', 'mission'].forEach(initSound);
}