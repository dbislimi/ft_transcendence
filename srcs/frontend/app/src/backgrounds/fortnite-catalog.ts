const fortniteBackgroundFiles = import.meta.glob('/img/background/fortnite_background/*.{webp,png,jpg,jpeg}', { 
  eager: true, 
  query: '?url',
  import: 'default'
});

export interface FortniteBackgroundItem {
  id: string;
  name: string;
  url: string;
  type: 'image';
  description: string;
  tags: string[];
  category: 'halloween' | 'noel' | 'season' | 'chapter' | 'event' | 'location';
}

function generateNameFromFilename(filename: string): { name: string; category: FortniteBackgroundItem['category'] } {
  const basename = filename.split('/').pop()?.replace(/\.(webp|png|jpg|jpeg)$/, '') || '';
  
  if (basename.startsWith('halloween_')) {
    const match = basename.match(/halloween_(\d+)_(.+)/);
    if (match) {
      const [, num, desc] = match;
      const descriptions: Record<string, string> = {
        'fortnitemares_2017': 'Fortnitemares 2017',
        'fortnitemares_2018': 'Fortnitemares 2018',
        'cube_queen': 'Cube Queen',
        'fortnitemares_2024': 'Fortnitemares 2024'
      };
      return { name: descriptions[desc] || desc.replace(/_/g, ' '), category: 'halloween' };
    }
  }
  
  if (basename.startsWith('noel_')) {
    const match = basename.match(/noel_(\d+)_(.+)/);
    if (match) {
      const [, num, desc] = match;
      const descriptions: Record<string, string> = {
        'winterfest_2017': 'Winterfest 2017',
        'winterfest_2019': 'Winterfest 2019'
      };
      return { name: descriptions[desc] || desc.replace(/_/g, ' '), category: 'noel' };
    }
  }
  
  if (basename.startsWith('season_')) {
    const match = basename.match(/season_(\d+)(?:_(.+))?/);
    if (match) {
      const [, num, desc] = match;
      const seasonNum = parseInt(num);
      if (seasonNum === 0) {
        return { name: 'Pre-Season', category: 'season' };
      }
      const name = desc ? `Season ${seasonNum} (${desc.replace(/_/g, ' ')})` : `Season ${seasonNum}`;
      return { name, category: 'season' };
    }
  }
  
  if (basename.startsWith('chapter_')) {
    const match = basename.match(/chapter_(\d+)_season_(\w+)/);
    if (match) {
      const [, chapter, season] = match;
      const chapterNum = parseInt(chapter);
      const seasonDisplay = season === 'og' ? 'OG' : season;
      return { name: `Chapter ${chapterNum} Season ${seasonDisplay}`, category: 'chapter' };
    }
  }
  
  if (basename.startsWith('event_')) {
    const eventName = basename.replace('event_', '').replace(/_/g, ' ');
    const eventNames: Record<string, string> = {
      'avatar elements': 'Avatar: Elements',
      'find the force': 'Find the Force',
      'star wars day 2024': 'Star Wars Day 2024',
      'galactic battle': 'Galactic Battle',
      'the big bang': 'The Big Bang',
      'mecha team leader': 'Mecha Team Leader'
    };
    return { name: eventNames[eventName] || eventName, category: 'event' };
  }
  
  if (basename.startsWith('location_')) {
    const locationName = basename.replace('location_', '').replace(/_/g, ' ');
    return { name: locationName.charAt(0).toUpperCase() + locationName.slice(1), category: 'location' };
  }
  
  return { name: basename.replace(/_/g, ' '), category: 'event' };
}

function generateDescription(name: string, category: FortniteBackgroundItem['category']): string {
  const categoryDescriptions: Record<string, string> = {
    halloween: 'Événement Halloween',
    noel: 'Événement de Noël',
    season: 'Saison classique',
    chapter: 'Nouveau chapitre',
    event: 'Événement spécial',
    location: 'Lieu emblématique'
  };
  
  return `${name} - ${categoryDescriptions[category]}`;
}

function buildFortniteBackgrounds(): FortniteBackgroundItem[] {
  const items: FortniteBackgroundItem[] = [];
  
  for (const [path, url] of Object.entries(fortniteBackgroundFiles)) {
    const filename = path.split('/').pop() || '';
    const id = `fortnite-${filename.replace(/\.(webp|png|jpg|jpeg)$/, '')}`;
    
    const { name, category } = generateNameFromFilename(path);
    const description = generateDescription(name, category);

    items.push({
      id,
      name,
      url: url as string,
      type: 'image',
      description,
      tags: ['fortnite', category, name.toLowerCase()],
      category
    });
  }
  
  items.sort((a, b) => {
    if (a.category !== b.category) {
      const order = ['halloween', 'noel', 'season', 'chapter', 'event', 'location'];
      return order.indexOf(a.category) - order.indexOf(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  return items;
}

export const fortniteBackgrounds: FortniteBackgroundItem[] = buildFortniteBackgrounds();

export function getFortniteBackgroundById(id: string): FortniteBackgroundItem | undefined {
  return fortniteBackgrounds.find(bg => bg.id === id);
}
export function getFortniteBackgroundsByCategory(category: FortniteBackgroundItem['category']): FortniteBackgroundItem[] {
  return fortniteBackgrounds.filter(bg => bg.category === category);
}
