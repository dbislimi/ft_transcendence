// backgrounds avec Vite global

import { fortniteBackgrounds, type FortniteBackgroundItem } from './fortnite-catalog';

const backgroundFiles = import.meta.glob('/img/background/*.{svg,webp,png,jpg,jpeg}', { 
  eager: true, 
  query: '?url',
  import: 'default'
});

export interface BackgroundItem {
  id: string;
  name: string;
  url: string | null;
  type: 'image' | 'svg' | 'default';
  description: string;
  tags?: string[];
}

function generateNameFromFilename(filename: string): string {
  const basename = filename.split('/').pop()?.replace(/\.(svg|webp|png|jpg|jpeg)$/, '') || '';
  
  const specialNames: Record<string, string> = {
    '42background': '42',
    'hallowenn_background': 'Halloween',
    'matrix_42_background': 'Matrix 42',
    'snow_background': 'Neige',
    'matrix': 'Matrix',
    'forest': 'Forêt',
    'grace': 'Grace',
    'batman': 'Batman',
    'dark_souls': 'Dark Souls',
    'the_last_of_us': 'The Last of Us',
    'windows95': 'Windows 95',
    'bit_cloud': 'Bit Cloud',
    'theft': 'Theft',
    'kitti': 'Kitti',
    '1': 'Gradient 1',
    'pexels-padrinan-19670': 'Paysage Naturel',
    'pexels-umkreisel-app-956999': 'Ciel Étoilé'
  };

  return specialNames[basename] || basename
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function generateDescription(name: string, filename: string): string {
  const descriptions: Record<string, string> = {
    '42': 'Logo emblématique de 42',
    'Halloween': 'Ambiance mystérieuse d\'Halloween',
    'Matrix 42': 'Style Matrix avec code',
    'Neige': 'Flocons de neige animés',
    'Matrix': 'Effet Matrix digital',
    'Forêt': 'Paysage forestier naturel',
    'Grace': 'Ambiance gracieuse et élégante',
    'Batman': 'Univers sombre de Gotham',
    'Dark Souls': 'Atmosphère épique et mystérieuse',
    'The Last of Us': 'Post-apocalyptique',
    'Windows 95': 'Nostalgie',
    'Bit Cloud': 'Nuages pixelisés',
    'Theft': 'Ambiance urbaine nocturne',
    'Kitti': 'Chaton',
    'Gradient 1': 'Dégradé coloré moderne',
    'Paysage Naturel': 'Vue panoramique de la nature',
    'Ciel Étoilé': 'Nuit étoilée'
  };

  return descriptions[name] || `Arrière-plan ${name.toLowerCase()}`;
}

// Determine le type de fichier
function getFileType(filename: string): 'image' | 'svg' {
  return filename.endsWith('.svg') ? 'svg' : 'image';
}

function buildCatalog(): BackgroundItem[] {
  const items: BackgroundItem[] = [];
  items.push({
    id: 'default',
    name: 'Par défaut',
    url: null,
    type: 'default',
    description: 'Arrière-plan simple et épuré',
    tags: ['default', 'simple']
  });
  for (const [path, url] of Object.entries(backgroundFiles)) {
    const filename = path.split('/').pop() || '';
    const id = filename.replace(/\.(svg|webp|png|jpg|jpeg)$/, '').replace(/_/g, '-');
    if (id === '42background')
      continue;
    
    const name = generateNameFromFilename(path);
    const description = generateDescription(name, filename);
    const type = getFileType(filename);

    items.push({
      id,
      name,
      url: url as string,
      type,
      description,
      tags: [type, name.toLowerCase()]
    });
  }

  // on l'adore ce Dylan
  const theme42Path = Object.keys(backgroundFiles).find(path => path.includes('42background'));
  if (theme42Path) {
    const theme42Url = backgroundFiles[theme42Path] as string;
    items.push({
      id: '42background',
      name: '42',
      url: theme42Url,
      type: 'image',
      description: 'Logo emblématique de 42',
      tags: ['42', 'logo', 'special']
    });
  }

  return items;
}


export const backgroundCatalog: BackgroundItem[] = buildCatalog();

// Convertir les backgrounds Fortnite en BackgroundItem
const fortniteBackgroundItems: BackgroundItem[] = fortniteBackgrounds.map(fb => ({
  id: fb.id,
  name: fb.name,
  url: fb.url,
  type: 'image' as const,
  description: fb.description,
  tags: fb.tags
}));

// Catalogue complet avec tous les backgrounds
export const allBackgrounds: BackgroundItem[] = [...backgroundCatalog, ...fortniteBackgroundItems];

// Trouve un background par ID (cherche dans tous les backgrounds)
export function getBackgroundById(id: string): BackgroundItem | undefined {
  return allBackgrounds.find(bg => bg.id === id);
}

// Obtient l'URL d'un background par ID
export function getBackgroundUrl(id: string): string | null {
  const bg = getBackgroundById(id);
  return bg?.url || null;
}

export function getBackgroundsByType(type: 'image' | 'svg' | 'default'): BackgroundItem[] {
  return allBackgrounds.filter(bg => bg.type === type);
}

// Tag backgrounds
export function searchBackgrounds(query: string): BackgroundItem[] {
  const lowerQuery = query.toLowerCase();
  return allBackgrounds.filter(bg => 
    bg.name.toLowerCase().includes(lowerQuery) ||
    bg.description.toLowerCase().includes(lowerQuery) ||
    bg.tags?.some(tag => tag.includes(lowerQuery))
  );
}

export function logCatalog(): void {
  console.log('[Backgrounds] Catalog loaded:', {
    total: allBackgrounds.length,
    general: backgroundCatalog.length,
    fortnite: fortniteBackgroundItems.length,
    types: {
      default: getBackgroundsByType('default').length,
      svg: getBackgroundsByType('svg').length,
      image: getBackgroundsByType('image').length
    },
    items: allBackgrounds.map(bg => ({
      id: bg.id,
      name: bg.name,
      type: bg.type
    }))
  });
}

if (import.meta.env.DEV) {
  logCatalog();
}
