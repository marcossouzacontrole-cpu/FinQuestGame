import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export function XPParticles({ amount, x, y }) {
  useEffect(() => {
    const particles = [];
    const colors = ['#00FFFF', '#FF00FF', '#39FF14'];
    
    for (let i = 0; i < Math.min(amount / 10, 20); i++) {
      const particle = document.createElement('div');
      particle.className = 'xp-particle';
      particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 8px;
        height: 8px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 0 10px currentColor;
      `;
      
      document.body.appendChild(particle);
      particles.push(particle);
      
      const angle = (Math.PI * 2 * i) / Math.min(amount / 10, 20);
      const velocity = 2 + Math.random() * 2;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity - 3;
      
      let posX = x;
      let posY = y;
      let opacity = 1;
      let velY = vy;
      
      const animate = () => {
        posX += vx;
        posY += velY;
        velY += 0.15;
        opacity -= 0.02;
        
        particle.style.left = posX + 'px';
        particle.style.top = posY + 'px';
        particle.style.opacity = opacity;
        
        if (opacity > 0) {
          requestAnimationFrame(animate);
        } else {
          particle.remove();
        }
      };
      
      requestAnimationFrame(animate);
    }
    
    return () => particles.forEach(p => p.remove());
  }, [amount, x, y]);
  
  return null;
}

export function GoldParticles({ amount, x, y }) {
  useEffect(() => {
    confetti({
      particleCount: Math.min(amount, 30),
      startVelocity: 25,
      spread: 60,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ['#FFD700', '#FFA500', '#FFFF00'],
      shapes: ['circle'],
      gravity: 1.2,
      scalar: 1.2,
    });
  }, [amount, x, y]);
  
  return null;
}

export function LevelUpEffect() {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#00FFFF', '#FF00FF', '#39FF14'],
      });
      
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#00FFFF', '#FF00FF', '#39FF14'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return null;
}

export function MissionCompleteEffect() {
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00FFFF', '#FF00FF', '#39FF14', '#FFD700'],
    });
  }, []);

  return null;
}