import { Movie, LLMMovieCard } from '../models/Movie';
import { Logger } from '../utils/Logger';

export interface AttributionInfo {
  source: string;
  license: string;
  attribution: string;
  url?: string;
  lastUpdated: Date;
}

export interface CopyrightCheckResult {
  isCompliant: boolean;
  issues: string[];
  recommendations: string[];
  attributions: AttributionInfo[];
}

export interface ContentValidationResult {
  isOriginal: boolean;
  similarityScore: number;
  potentialIssues: string[];
  recommendations: string[];
}

export class CopyrightService {
  private logger: Logger;

  private prohibitedSources: Set<string>;
  private allowedSources: Map<string, AttributionInfo>;

  constructor() {
    this.logger = new Logger();
    this.prohibitedSources = new Set();
    this.allowedSources = new Map();
    this.initializeSourceDatabase();
  }

  /**
   * Initialize the database of allowed and prohibited sources
   */
  private initializeSourceDatabase(): void {
    // OMDb API - Allowed with attribution
    this.allowedSources.set('omdb', {
      source: 'OMDb API',
      license: 'CC BY-NC 4.0',
      attribution: 'Movie data provided by OMDb API (www.omdbapi.com)',
      url: 'http://www.omdbapi.com/',
      lastUpdated: new Date()
    });

    // TMDB API - Restricted for commercial use
    this.allowedSources.set('tmdb', {
      source: 'The Movie Database (TMDB)',
      license: 'CC BY-NC 4.0 (Non-commercial only)',
      attribution: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
      url: 'https://www.themoviedb.org/',
      lastUpdated: new Date()
    });

    // Prohibited sources (copyrighted content)
    this.prohibitedSources.add('imdb-scraping');
    this.prohibitedSources.add('rotten-tomatoes-scraping');
    this.prohibitedSources.add('metacritic-scraping');
    this.prohibitedSources.add('wikipedia-images');
    this.prohibitedSources.add('studio-official-content');

    this.logger.info('Copyright source database initialized', {
      allowedSources: this.allowedSources.size,
      prohibitedSources: this.prohibitedSources.size
    });
  }

  /**
   * Check copyright compliance for movie data
   */
  async checkMovieCompliance(movie: Movie, source: string): Promise<CopyrightCheckResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const attributions: AttributionInfo[] = [];

    try {
      // Check if source is prohibited
      if (this.prohibitedSources.has(source)) {
        issues.push(`Source '${source}' is prohibited due to copyright restrictions`);
        recommendations.push('Use only approved APIs like OMDb or TMDB with proper licensing');
      }

      // Check if source is allowed
      const sourceInfo = this.allowedSources.get(source);
      if (!sourceInfo) {
        issues.push(`Source '${source}' is not in the approved sources list`);
        recommendations.push('Verify licensing terms and add to approved sources if compliant');
      } else {
        attributions.push(sourceInfo);
      }

      // Check for potential copyright issues in content
      const contentIssues = this.checkContentForCopyrightIssues(movie);
      issues.push(...contentIssues.issues);
      recommendations.push(...contentIssues.recommendations);

      // Check poster URL compliance
      if (movie.posterUrl && movie.posterUrl !== 'N/A') {
        const posterCheck = this.checkImageCompliance(movie.posterUrl);
        if (!posterCheck.isCompliant) {
          issues.push('Poster image may have copyright restrictions');
          recommendations.push('Use only poster URLs from approved APIs or public domain sources');
        }
      }

      const isCompliant = issues.length === 0;

      this.logger.info('Movie copyright compliance check completed', {
        movieId: movie.imdbId,
        isCompliant,
        issuesCount: issues.length
      });

      return {
        isCompliant,
        issues,
        recommendations,
        attributions
      };
    } catch (error) {
      this.logger.error('Failed to check movie compliance', {
        movieId: movie.imdbId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate LLM-generated content for originality and copyright compliance
   */
  async validateLLMContent(movieCard: LLMMovieCard, originalMovie: Movie): Promise<ContentValidationResult> {
    try {
      const potentialIssues: string[] = [];
      const recommendations: string[] = [];

      // Check for potential copying of original plot
      const similarityScore = this.calculateSimilarity(movieCard.generatedSummary, originalMovie.plotSummary || '');
      
      if (similarityScore > 0.8) {
        potentialIssues.push('Generated summary has high similarity to original plot');
        recommendations.push('Regenerate content with more emphasis on original analysis and interpretation');
      }

      // Check for copyrighted phrases or quotes
      const copyrightedPhrases = this.detectCopyrightedPhrases(movieCard.generatedSummary);
      if (copyrightedPhrases.length > 0) {
        potentialIssues.push(`Detected potential copyrighted phrases: ${copyrightedPhrases.join(', ')}`);
        recommendations.push('Remove or rephrase potential copyrighted content');
      }

      // Check for proper transformative content
      const isTransformative = this.checkTransformativeContent(movieCard);
      if (!isTransformative) {
        potentialIssues.push('Content may not be sufficiently transformative');
        recommendations.push('Add more original analysis, themes, and interpretation');
      }

      const isOriginal = potentialIssues.length === 0 && similarityScore < 0.5;

      this.logger.info('LLM content validation completed', {
        movieCardId: movieCard.id,
        isOriginal,
        similarityScore,
        issuesCount: potentialIssues.length
      });

      return {
        isOriginal,
        similarityScore,
        potentialIssues,
        recommendations
      };
    } catch (error) {
      this.logger.error('Failed to validate LLM content', {
        movieCardId: movieCard.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate proper attribution text for a given source
   */
  generateAttribution(sources: string[]): string {
    const attributions: string[] = [];

    for (const source of sources) {
      const sourceInfo = this.allowedSources.get(source);
      if (sourceInfo) {
        attributions.push(sourceInfo.attribution);
      }
    }

    if (attributions.length === 0) {
      return 'Data sources not specified or not properly licensed.';
    }

    return attributions.join(' | ');
  }

  /**
   * Check if an image URL is compliant with copyright rules
   */
  private checkImageCompliance(imageUrl: string): { isCompliant: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for known problematic domains
    const prohibitedDomains = [
      'images.google.com',
      'pinterest.com',
      'instagram.com',
      'facebook.com',
      'twitter.com'
    ];

    const url = new URL(imageUrl);
    if (prohibitedDomains.some(domain => url.hostname.includes(domain))) {
      issues.push(`Image hosted on potentially problematic domain: ${url.hostname}`);
    }

    // Check for approved image sources
    const approvedDomains = [
      'm.media-amazon.com', // IMDb images (when properly licensed)
      'image.tmdb.org',     // TMDB images
      'ia.media-imdb.com'   // IMDb images
    ];

    const isApprovedDomain = approvedDomains.some(domain => url.hostname.includes(domain));
    if (!isApprovedDomain) {
      issues.push('Image source not from approved domain');
    }

    return {
      isCompliant: issues.length === 0,
      issues
    };
  }

  /**
   * Check content for potential copyright issues
   */
  private checkContentForCopyrightIssues(movie: Movie): { issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for excessive detail that might indicate copying
    if (movie.plotSummary && movie.plotSummary.length > 500) {
      issues.push('Plot summary is unusually detailed, may indicate copying');
      recommendations.push('Use shorter, more general plot summaries');
    }

    // Check for specific copyrighted terms
    const copyrightedTerms = ['©', '®', '™', 'All rights reserved', 'Copyrighted'];
    const hascopyrightedTerms = copyrightedTerms.some(term => 
      movie.plotSummary?.includes(term) || movie.awards?.includes(term)
    );

    if (hascopyrightedTerms) {
      issues.push('Content contains copyright symbols or terms');
      recommendations.push('Remove copyright symbols and proprietary language');
    }

    return { issues, recommendations };
  }

  /**
   * Calculate similarity between two texts (simplified implementation)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Detect potentially copyrighted phrases
   */
  private detectCopyrightedPhrases(text: string): string[] {
    const copyrightedPhrases = [
      'Academy Award',
      'Oscar winner',
      'Golden Globe',
      'Emmy Award',
      'Cannes Film Festival',
      'Sundance',
      'Box office hit',
      'Blockbuster sensation'
    ];

    return copyrightedPhrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );
  }

  /**
   * Check if content is sufficiently transformative
   */
  private checkTransformativeContent(movieCard: LLMMovieCard): boolean {
    // Check for original analysis elements
    const hasThemes = movieCard.keyThemes && movieCard.keyThemes.length > 0;
    const hasMoodTags = movieCard.moodTags && movieCard.moodTags.length > 0;
    const hasGeneratedSummary = movieCard.generatedSummary && movieCard.generatedSummary.length > 0;
    const hasTargetAudience = movieCard.targetAudience && movieCard.targetAudience.length > 0;

    // Content should have at least 3 of these transformative elements
    const transformativeElements = [hasThemes, hasMoodTags, hasGeneratedSummary, hasTargetAudience];
    const transformativeCount = transformativeElements.filter(Boolean).length;

    return transformativeCount >= 3;
  }

  /**
   * Get compliance report for the entire system
   */
  async getComplianceReport(): Promise<{
    allowedSources: AttributionInfo[];
    prohibitedSources: string[];
    recommendations: string[];
  }> {
    return {
      allowedSources: Array.from(this.allowedSources.values()),
      prohibitedSources: Array.from(this.prohibitedSources),
      recommendations: [
        'Always use approved APIs with proper attribution',
        'Generate original, transformative content with LLM',
        'Avoid copying plot summaries or reviews',
        'Use only approved image sources',
        'Regularly review and update licensing compliance',
        'Implement content validation before publication'
      ]
    };
  }

  /**
   * Add a new allowed source
   */
  addAllowedSource(key: string, attribution: AttributionInfo): void {
    this.allowedSources.set(key, attribution);
    this.logger.info('New allowed source added', { source: key });
  }

  /**
   * Remove a source from allowed list
   */
  removeAllowedSource(key: string): void {
    this.allowedSources.delete(key);
    this.logger.info('Source removed from allowed list', { source: key });
  }

  /**
   * Add a prohibited source
   */
  addProhibitedSource(source: string): void {
    this.prohibitedSources.add(source);
    this.logger.info('New prohibited source added', { source });
  }

  /**
   * Health check for copyright service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      return {
        status: 'healthy',
        details: {
          allowedSourcesCount: this.allowedSources.size,
          prohibitedSourcesCount: this.prohibitedSources.size,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}