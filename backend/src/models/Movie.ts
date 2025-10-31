// Movie model with TypeScript interfaces and validation
import { z } from 'zod';

// Base Movie interface
export interface Movie {
  id: string;
  imdbId: string;
  title: string;
  originalTitle?: string;
  releaseYear?: number;
  releaseDate?: Date;
  runtimeMinutes?: number;
  plotSummary?: string;
  plotShort?: string;
  ratingImdb?: number;
  ratingRottenTomatoes?: number;
  ratingMetacritic?: number;
  boxOfficeGross?: number;
  budget?: number;
  language?: string;
  country?: string;
  director?: string;
  writer?: string;
  awards?: string;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  apiSource: string;
  lastUpdated: Date;
  createdAt: Date;
}

// Movie with related data
export interface MovieWithDetails extends Movie {
  genres: Genre[];
  cast: MovieCredit[];
  crew: MovieCredit[];
  images: MovieImage[];
  llmCard?: LLMMovieCard;
}

// Genre interface
export interface Genre {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
}

// Person interface
export interface Person {
  id: string;
  imdbId?: string;
  name: string;
  birthDate?: Date;
  birthPlace?: string;
  biography?: string;
  profileImageUrl?: string;
  knownForDepartment?: string;
  apiSource: string;
  lastUpdated: Date;
  createdAt: Date;
}

// Movie Credit interface
export interface MovieCredit {
  id: string;
  movieId: string;
  personId: string;
  roleType: 'actor' | 'director' | 'writer' | 'producer' | 'cinematographer' | 'editor' | 'composer' | 'other';
  characterName?: string;
  jobTitle?: string;
  creditOrder?: number;
  createdAt: Date;
  person?: Person;
}

// Movie Image interface
export interface MovieImage {
  id: string;
  movieId: string;
  imageType: 'poster' | 'backdrop' | 'still' | 'logo';
  imageUrl: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  fileSizeKb?: number;
  language?: string;
  isPrimary: boolean;
  createdAt: Date;
}

// LLM Movie Card interface
export interface LLMMovieCard {
  id: string;
  movieId: string;
  generatedSummary: string;
  generatedTitle?: string;
  keyThemes: string[];
  targetAudience?: string;
  moodTags: string[];
  llmModel: string;
  generationPrompt?: string;
  generationTimestamp: Date;
  qualityScore?: number;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

// Trending Movie interface
export interface TrendingMovie {
  id: string;
  movieId: string;
  trendDate: Date;
  trendRank: number;
  trendScore?: number;
  trendSource: string;
  createdAt: Date;
  movie?: Movie;
}

// Validation schemas using Zod
export const MovieCreateSchema = z.object({
  imdbId: z.string().min(1, 'IMDb ID is required'),
  title: z.string().min(1, 'Title is required').max(500),
  originalTitle: z.string().max(500).optional(),
  releaseYear: z.number().int().min(1800).max(2100).optional(),
  releaseDate: z.date().optional(),
  runtimeMinutes: z.number().int().positive().optional(),
  plotSummary: z.string().optional(),
  plotShort: z.string().optional(),
  ratingImdb: z.number().min(0).max(10).optional(),
  ratingRottenTomatoes: z.number().int().min(0).max(100).optional(),
  ratingMetacritic: z.number().int().min(0).max(100).optional(),
  boxOfficeGross: z.number().int().positive().optional(),
  budget: z.number().int().positive().optional(),
  language: z.string().max(10).optional(),
  country: z.string().max(100).optional(),
  director: z.string().max(200).optional(),
  writer: z.string().optional(),
  awards: z.string().optional(),
  posterUrl: z.string().url().max(1000).optional(),
  backdropUrl: z.string().url().max(1000).optional(),
  trailerUrl: z.string().url().max(1000).optional(),
  apiSource: z.string().max(20).default('omdb'),
});

export const MovieUpdateSchema = MovieCreateSchema.partial().omit({ imdbId: true });

export const GenreCreateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});

export const PersonCreateSchema = z.object({
  imdbId: z.string().max(20).optional(),
  name: z.string().min(1).max(200),
  birthDate: z.date().optional(),
  birthPlace: z.string().max(200).optional(),
  biography: z.string().optional(),
  profileImageUrl: z.string().url().max(1000).optional(),
  knownForDepartment: z.string().max(50).optional(),
  apiSource: z.string().max(20).default('omdb'),
});

export const MovieCreditCreateSchema = z.object({
  movieId: z.string().uuid(),
  personId: z.string().uuid(),
  roleType: z.enum(['actor', 'director', 'writer', 'producer', 'cinematographer', 'editor', 'composer', 'other']),
  characterName: z.string().max(200).optional(),
  jobTitle: z.string().max(100).optional(),
  creditOrder: z.number().int().positive().optional(),
});

export const LLMMovieCardCreateSchema = z.object({
  movieId: z.string().uuid(),
  generatedSummary: z.string().min(100).max(1000), // 150-200 words roughly
  generatedTitle: z.string().max(500).optional(),
  keyThemes: z.array(z.string()).default([]),
  targetAudience: z.string().max(100).optional(),
  moodTags: z.array(z.string()).default([]),
  llmModel: z.string().max(50),
  generationPrompt: z.string().optional(),
  qualityScore: z.number().min(0).max(1).optional(),
});

// Type exports for validation
export type MovieCreateInput = z.infer<typeof MovieCreateSchema>;
export type MovieUpdateInput = z.infer<typeof MovieUpdateSchema>;
export type GenreCreateInput = z.infer<typeof GenreCreateSchema>;
export type PersonCreateInput = z.infer<typeof PersonCreateSchema>;
export type MovieCreditCreateInput = z.infer<typeof MovieCreditCreateSchema>;
export type LLMMovieCardCreateInput = z.infer<typeof LLMMovieCardCreateSchema>;

// Search and filter interfaces
export interface MovieSearchParams {
  query?: string;
  genre?: string;
  year?: number;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'title' | 'year' | 'rating' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MovieSearchResult {
  movies: MovieWithDetails[];
  total: number;
  page: number;
  totalPages: number;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// OMDb API response interfaces
export interface OMDbMovieResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{
    Source: string;
    Value: string;
  }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: string;
  Error?: string;
}

export interface OMDbSearchResponse {
  Search: Array<{
    Title: string;
    Year: string;
    imdbID: string;
    Type: string;
    Poster: string;
  }>;
  totalResults: string;
  Response: string;
  Error?: string;
}