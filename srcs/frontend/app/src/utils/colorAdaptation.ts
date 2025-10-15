/**
 * Système d'adaptation des couleurs selon l'arrière-plan
 * Analyse les couleurs dominantes et génère des schémas adaptatifs
 */

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  button: string;
  buttonHover: string;
  border: string;
  background: string;
  card: string;
}

export interface BackgroundAnalysis {
  isDark: boolean;
  isBright: boolean;
  dominantColor: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray' | 'neutral';
  contrast: 'high' | 'medium' | 'low';
  recommendedScheme: ColorScheme;
}

const COLOR_SCHEMES: Record<string, ColorScheme> = {
  // Fonds sombres
  'dark-blue': {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    button: '#1E40AF',
    buttonHover: '#1D4ED8',
    border: '#475569',
    background: '#0F172A',
    card: '#1E293B'
  },
  'dark-matrix': {
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    text: '#F0FDF4',
    textSecondary: '#BBF7D0',
    button: '#059669',
    buttonHover: '#047857',
    border: '#374151',
    background: '#111827',
    card: '#1F2937'
  },
  'dark-halloween': {
    primary: '#F59E0B',
    secondary: '#D97706',
    accent: '#FBBF24',
    text: '#FEF3C7',
    textSecondary: '#FDE68A',
    button: '#D97706',
    buttonHover: '#B45309',
    border: '#451A03',
    background: '#1C1917',
    card: '#292524'
  },
  'dark-snow': {
    primary: '#06B6D4',
    secondary: '#0891B2',
    accent: '#22D3EE',
    text: '#F0F9FF',
    textSecondary: '#BAE6FD',
    button: '#0891B2',
    buttonHover: '#0E7490',
    border: '#475569',
    background: '#0F172A',
    card: '#1E293B'
  },
  
  // Fonds clairs
  'light-nature': {
    primary: '#059669',
    secondary: '#047857',
    accent: '#10B981',
    text: '#064E3B',
    textSecondary: '#065F46',
    button: '#059669',
    buttonHover: '#047857',
    border: '#A7F3D0',
    background: '#F0FDF4',
    card: '#ECFDF5'
  },
  'light-sky': {
    primary: '#2563EB',
    secondary: '#1D4ED8',
    accent: '#3B82F6',
    text: '#1E3A8A',
    textSecondary: '#1E40AF',
    button: '#2563EB',
    buttonHover: '#1D4ED8',
    border: '#BFDBFE',
    background: '#EFF6FF',
    card: '#F8FAFC'
  },
  'light-gradient': {
    primary: '#7C3AED',
    secondary: '#6D28D9',
    accent: '#8B5CF6',
    text: '#581C87',
    textSecondary: '#6B21A8',
    button: '#7C3AED',
    buttonHover: '#6D28D9',
    border: '#C4B5FD',
    background: '#FAF5FF',
    card: '#F3E8FF'
  },
  
  // Fonds neutres
  'neutral-dark': {
    primary: '#6B7280',
    secondary: '#4B5563',
    accent: '#9CA3AF',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    button: '#4B5563',
    buttonHover: '#374151',
    border: '#6B7280',
    background: '#111827',
    card: '#1F2937'
  },
  
  'default-dark': {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    button: '#1E40AF',
    buttonHover: '#1D4ED8',
    border: '#475569',
    background: '#0F172A',
    card: '#1E293B'
  },
  'neutral-light': {
    primary: '#6B7280',
    secondary: '#4B5563',
    accent: '#9CA3AF',
    text: '#111827',
    textSecondary: '#374151',
    button: '#6B7280',
    buttonHover: '#4B5563',
    border: '#D1D5DB',
    background: '#F9FAFB',
    card: '#FFFFFF'
  }
};

/**
 * Analyse un fond et détermine le schéma de couleurs approprié
 */
export function analyzeBackground(backgroundId: string, backgroundUrl?: string): BackgroundAnalysis {
  const backgroundMappings: Record<string, string> = {
    // Fonds sombres
    'default': 'default-dark',
    '42': 'dark-blue',
    'matrix-42': 'dark-matrix',
    'hallowenn-background': 'dark-halloween',
    'snow-background': 'dark-snow',
    'matrix': 'dark-matrix',
    'batman': 'dark-blue',
    'dark-souls': 'dark-halloween',
    'the-last-of-us': 'dark-halloween',
    'theft': 'dark-blue',
    
    // Fonds clairs
    'forest': 'light-nature',
    'grace': 'light-sky',
    'kitti': 'light-gradient',
    '1': 'light-gradient',
    'pexels-padrinan-19670': 'light-nature',
    'pexels-umkreisel-app-956999': 'light-sky',
    
    // Fonds neutres
    'windows95': 'neutral-light',
    'bit-cloud': 'neutral-dark'
  };

  const schemeKey = backgroundMappings[backgroundId] || 'neutral-dark';
  const scheme = COLOR_SCHEMES[schemeKey];

  return {
    isDark: schemeKey.includes('dark') || schemeKey.includes('matrix') || schemeKey.includes('halloween'),
    isBright: schemeKey.includes('light') || schemeKey.includes('nature') || schemeKey.includes('sky'),
    dominantColor: getDominantColorFromScheme(schemeKey),
    contrast: getContrastLevel(schemeKey),
    recommendedScheme: scheme
  };
}

/**
 * Détermine la couleur dominante à partir de la clé du schéma
 */
function getDominantColorFromScheme(schemeKey: string): BackgroundAnalysis['dominantColor'] {
  if (schemeKey.includes('blue')) return 'blue';
  if (schemeKey.includes('green') || schemeKey.includes('nature')) return 'green';
  if (schemeKey.includes('red') || schemeKey.includes('halloween')) return 'red';
  if (schemeKey.includes('purple') || schemeKey.includes('gradient')) return 'purple';
  if (schemeKey.includes('orange')) return 'orange';
  if (schemeKey.includes('matrix')) return 'green';
  return 'neutral';
}

/**
 * Détermine le niveau de contraste
 */
function getContrastLevel(schemeKey: string): BackgroundAnalysis['contrast'] {
  if (schemeKey.includes('matrix') || schemeKey.includes('halloween')) return 'high';
  if (schemeKey.includes('dark') || schemeKey.includes('light')) return 'medium';
  return 'low';
}

/**
 * Applique un schéma de couleurs au document
 */
export function applyColorScheme(scheme: ColorScheme): void {
  const root = document.documentElement;
  
  root.style.setProperty('--color-primary', scheme.primary);
  root.style.setProperty('--color-secondary', scheme.secondary);
  root.style.setProperty('--color-accent', scheme.accent);
  root.style.setProperty('--color-text', scheme.text);
  root.style.setProperty('--color-text-secondary', scheme.textSecondary);
  root.style.setProperty('--color-button', scheme.button);
  root.style.setProperty('--color-button-hover', scheme.buttonHover);
  root.style.setProperty('--color-border', scheme.border);
  root.style.setProperty('--color-background', scheme.background);
  root.style.setProperty('--color-card', scheme.card);
  
  document.body.className = document.body.className
    .split(' ')
    .filter(cls => !cls.startsWith('color-scheme-'))
    .concat([`color-scheme-${scheme.primary.replace('#', '')}`])
    .join(' ');
}


export function generateAdaptiveColors(imageUrl: string): Promise<ColorScheme> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(COLOR_SCHEMES['neutral-dark']);
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const colors = analyzeImageColors(imageData);
      
      const scheme = generateSchemeFromColors(colors);
      resolve(scheme);
    };
    
    img.onerror = () => {
      resolve(COLOR_SCHEMES['neutral-dark']);
    };
    
    img.src = imageUrl;
  });
}


function analyzeImageColors(imageData: ImageData): { r: number; g: number; b: number; brightness: number }[] {
  const data = imageData.data;
  const colors: { r: number; g: number; b: number; brightness: number }[] = [];
  
  // Sample pixels (every 100 pixels)
  for (let i = 0; i < data.length; i += 400) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    
    colors.push({ r, g, b, brightness });
  }
  
  return colors;
}

function generateSchemeFromColors(colors: { r: number; g: number; b: number; brightness: number }[]): ColorScheme {
  const avgBrightness = colors.reduce((sum, color) => sum + color.brightness, 0) / colors.length;
  const isDark = avgBrightness < 128;
  
  const avgR = colors.reduce((sum, color) => sum + color.r, 0) / colors.length;
  const avgG = colors.reduce((sum, color) => sum + color.g, 0) / colors.length;
  const avgB = colors.reduce((sum, color) => sum + color.b, 0) / colors.length;
  
  const primary = `rgb(${Math.round(avgR)}, ${Math.round(avgG)}, ${Math.round(avgB)})`;
  
  if (isDark) {
    return {
      primary,
      secondary: adjustBrightness(primary, -30),
      accent: adjustBrightness(primary, 30),
      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      button: adjustBrightness(primary, -20),
      buttonHover: adjustBrightness(primary, -40),
      border: adjustBrightness(primary, -50),
      background: '#0F172A',
      card: '#1E293B'
    };
  } else {
    return {
      primary,
      secondary: adjustBrightness(primary, -20),
      accent: adjustBrightness(primary, 20),
      text: '#111827',
      textSecondary: '#374151',
      button: primary,
      buttonHover: adjustBrightness(primary, -20),
      border: adjustBrightness(primary, 30),
      background: '#F9FAFB',
      card: '#FFFFFF'
    };
  }
}

/**
 * Ajuste la luminosité d'une couleur RGB
 */
function adjustBrightness(rgb: string, amount: number): string {
  const match = rgb.match(/rgb\((\d+), (\d+), (\d+)\)/);
  if (!match) return rgb;
  
  const r = Math.max(0, Math.min(255, parseInt(match[1]) + amount));
  const g = Math.max(0, Math.min(255, parseInt(match[2]) + amount));
  const b = Math.max(0, Math.min(255, parseInt(match[3]) + amount));
  
  return `rgb(${r}, ${g}, ${b})`;
}
