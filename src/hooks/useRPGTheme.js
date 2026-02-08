import { useEffect } from 'react';

const CLASS_THEMES = {
    'Guerreiro': {
        '--primary-glow': '#ef4444', // Red
        '--secondary-glow': '#f59e0b', // Amber
        '--accent-glow': '#7c2d12',
        '--bg-accent': 'rgba(239, 68, 68, 0.1)'
    },
    'Mago': {
        '--primary-glow': '#a855f7', // Purple
        '--secondary-glow': '#06b6d4', // Cyan
        '--accent-glow': '#4c1d95',
        '--bg-accent': 'rgba(168, 85, 247, 0.1)'
    },
    'Paladino': {
        '--primary-glow': '#eab308', // Yellow
        '--secondary-glow': '#ffffff', // White
        '--accent-glow': '#713f12',
        '--bg-accent': 'rgba(234, 179, 8, 0.1)'
    },
    'Assassino': {
        '--primary-glow': '#39FF14', // Neon Green
        '--secondary-glow': '#1f2937', // Slate
        '--accent-glow': '#064e3b',
        '--bg-accent': 'rgba(57, 255, 20, 0.1)'
    },
    'Aprendiz': {
        '--primary-glow': '#00FFFF', // Cyan
        '--secondary-glow': '#FF00FF', // Magenta
        '--accent-glow': '#0e7490',
        '--bg-accent': 'rgba(0, 255, 255, 0.1)'
    }
};

export function useRPGTheme(playerClass) {
    useEffect(() => {
        const theme = CLASS_THEMES[playerClass] || CLASS_THEMES['Aprendiz'];
        const root = document.documentElement;

        Object.entries(theme).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }, [playerClass]);
}
