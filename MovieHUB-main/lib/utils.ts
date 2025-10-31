import { OMDbRating } from '@/types/movie';

export function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatYear(dateString: string): string {
  if (!dateString) return 'Unknown';
  return new Date(dateString).getFullYear().toString();
}

export function formatRuntime(minutes: number): string {
  if (!minutes) return 'Unknown';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

export function formatCurrency(amount: number): string {
  if (!amount) return 'Unknown';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatVoteCount(count: number): string {
  if (!count) return '0';
  
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  
  return count.toString();
}

export function getRatingColor(rating: number): string {
  if (rating >= 8) return 'text-green-400';
  if (rating >= 7) return 'text-yellow-400';
  if (rating >= 6) return 'text-orange-400';
  return 'text-red-400';
}

export function getRatingBadgeColor(rating: number): string {
  if (rating >= 8) return 'bg-green-500';
  if (rating >= 7) return 'bg-yellow-500';
  if (rating >= 6) return 'bg-orange-500';
  return 'bg-red-500';
}

export function parseOMDbRatings(ratings: OMDbRating[]) {
  const ratingMap: { [key: string]: string } = {};
  
  ratings.forEach(rating => {
    switch (rating.Source) {
      case 'Internet Movie Database':
        ratingMap.imdb = rating.Value;
        break;
      case 'Rotten Tomatoes':
        ratingMap.rottenTomatoes = rating.Value;
        break;
      case 'Metacritic':
        ratingMap.metacritic = rating.Value;
        break;
      default:
        ratingMap[rating.Source.toLowerCase().replace(/\s+/g, '')] = rating.Value;
    }
  });
  
  return ratingMap;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export function generateSlug(title: string, id: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  return `${slug}-${id}`;
}

export function extractIdFromSlug(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export function getGenreColor(genreName: string): string {
  const colors: { [key: string]: string } = {
    action: 'bg-red-500',
    adventure: 'bg-orange-500',
    animation: 'bg-pink-500',
    comedy: 'bg-yellow-500',
    crime: 'bg-gray-700',
    documentary: 'bg-blue-500',
    drama: 'bg-purple-500',
    family: 'bg-green-500',
    fantasy: 'bg-indigo-500',
    history: 'bg-amber-600',
    horror: 'bg-red-800',
    music: 'bg-pink-600',
    mystery: 'bg-gray-600',
    romance: 'bg-rose-500',
    'science fiction': 'bg-cyan-500',
    'tv movie': 'bg-slate-500',
    thriller: 'bg-red-700',
    war: 'bg-stone-600',
    western: 'bg-amber-700',
  };
  
  return colors[genreName.toLowerCase()] || 'bg-gray-500';
}

export interface DebouncedFunction<T extends (...args: any[]) => void> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  let latestArgs: Parameters<T> | null = null;

  const clear = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const debounced = (...args: Parameters<T>) => {
    latestArgs = args;
    clear();
    timeout = setTimeout(() => {
      timeout = null;
      if (latestArgs) {
        func(...latestArgs);
        latestArgs = null;
      }
    }, wait);
  };

  debounced.cancel = () => {
    clear();
    latestArgs = null;
  };

  debounced.flush = () => {
    if (latestArgs) {
      clear();
      const args = latestArgs;
      latestArgs = null;
      func(...args);
    }
  };

  return debounced;
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}