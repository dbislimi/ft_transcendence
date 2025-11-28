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
    'Gta 5': 'Gta 5',
    'kitti': 'Kitti',
    '1': 'Interstellar',
    'pexels-padrinan-19670': 'Paysage Naturel',
    'pexels-umkreisel-app-956999': 'Ciel etoile'
  };

  return specialNames[basename] || basename
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function generateDescription(name: string, filename: string): string {
  const descriptions: Record<string, string> = {
    '42': 'Logo emblematique de 42',
    'Halloween': 'Ambiance mysterieuse d\'Halloween',
    'Matrix 42': 'Style Matrix avec code',
    'Neige': 'Flocons de neige animes',
    'Matrix': 'Effet Matrix digital',
    'Forêt': 'Paysage forestier naturel',
    'Grace': 'Ambiance gracieuse et elegante',
    'Batman': 'Univers sombre de Gotham',
    'Dark Souls': 'Atmosphere epique et mysterieuse',
    'The Last of Us': 'Post-apocalyptique',
    'Windows 95': 'Nostalgie',
    'Bit Cloud': 'Nuages pixelises',
    'Gta 5': 'Ambiance urbaine nocturne',
    'Kitti': 'Chaton',
    'Interstellar': 'Voyage à travers les etoiles',
    'Paysage Naturel': 'Vue panoramique de la nature',
    'Ciel etoile': 'Nuit etoilee'
  };

  return descriptions[name] || `Arriere-plan ${name.toLowerCase()}`;
}

function getFileType(filename: string): 'image' | 'svg' {
  return filename.endsWith('.svg') ? 'svg' : 'image';
}

const LEGACY_ID_MAP: Record<string, string> = {
  'hallowenn-background': 'halloween',
  'matrix-42-background': 'matrix42',
  'snow-background': 'snow',
  '42background': '42',
};

function buildCatalog(): BackgroundItem[] {
  const items: BackgroundItem[] = [];
  items.push({
    id: 'default',
    name: 'Par defaut',
    url: null,
    type: 'default',
    description: 'Arriere-plan simple et epure',
    tags: ['default', 'simple']
  });
  for (const [path, url] of Object.entries(backgroundFiles)) {
    const filename = path.split('/').pop() || '';
    const generatedId = filename.replace(/\.(svg|webp|png|jpg|jpeg)$/, '').replace(/_/g, '-');
    const id = LEGACY_ID_MAP[generatedId] || generatedId;

    if (id === '42' || generatedId === '42background')
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

  const theme42Path = Object.keys(backgroundFiles).find(path => path.includes('42background'));
  if (theme42Path) {
    const theme42Url = backgroundFiles[theme42Path] as string;
    items.push({
      id: '42',
      name: '42',
      url: theme42Url,
      type: 'svg',
      description: 'Logo emblematique de 42',
      tags: ['42', 'logo', 'special', 'hidden']
    });
    if (import.meta.env.DEV) {
      // console.log('[Backgrounds] 42background ajoute au store avec ID "42":', theme42Url);
    }
  } else {
    if (import.meta.env.DEV) {
      // console.warn('[Backgrounds] 42background non trouve dans backgroundFiles:', Object.keys(backgroundFiles));
    }
  }

  return items;
}


export const backgroundCatalog: BackgroundItem[] = buildCatalog();

const fortniteBackgroundItems: BackgroundItem[] = fortniteBackgrounds.map(fb => ({
  id: fb.id,
  name: fb.name,
  url: fb.url,
  type: 'image' as const,
  description: fb.description,
  tags: fb.tags
}));

export const allBackgrounds: BackgroundItem[] = [...backgroundCatalog, ...fortniteBackgroundItems];
export function getBackgroundById(id: string): BackgroundItem | undefined {
  return allBackgrounds.find(bg => bg.id === id);
}

export function getBackgroundUrl(id: string): string | null {
  const bg = getBackgroundById(id);
  return bg?.url || null;
}

export function getBackgroundsByType(type: 'image' | 'svg' | 'default'): BackgroundItem[] {
  return allBackgrounds.filter(bg => bg.type === type);
}

export function searchBackgrounds(query: string): BackgroundItem[] {
  const lowerQuery = query.toLowerCase();
  return allBackgrounds.filter(bg =>
    bg.name.toLowerCase().includes(lowerQuery) ||
    bg.description.toLowerCase().includes(lowerQuery) ||
    bg.tags?.some(tag => tag.includes(lowerQuery))
  );
}

export function logCatalog(): void {
  // console.log('[Backgrounds] Catalog loaded:', {
  //   total: allBackgrounds.length,
  //   general: backgroundCatalog.length,
  //   fortnite: fortniteBackgroundItems.length,
  //   types: {
  //     default: getBackgroundsByType('default').length,
  //     svg: getBackgroundsByType('svg').length,
  //     image: getBackgroundsByType('image').length
  //   },
  //   items: allBackgrounds.map(bg => ({
  //     id: bg.id,
  //     name: bg.name,
  //     type: bg.type
  //   }))
  // });
}

if (import.meta.env.DEV) {
  logCatalog();
}
