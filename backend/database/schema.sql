-- Movie Information Aggregation System Database Schema
-- Designed for PostgreSQL with proper indexing and relationships

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Movies table - Core movie information
CREATE TABLE movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imdb_id VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    original_title VARCHAR(500),
    release_year INTEGER,
    release_date DATE,
    runtime_minutes INTEGER,
    plot_summary TEXT,
    plot_short TEXT,
    rating_imdb DECIMAL(3,1),
    rating_rotten_tomatoes INTEGER,
    rating_metacritic INTEGER,
    box_office_gross BIGINT,
    budget BIGINT,
    language VARCHAR(10),
    country VARCHAR(100),
    director VARCHAR(200),
    writer TEXT,
    awards TEXT,
    poster_url VARCHAR(1000),
    backdrop_url VARCHAR(1000),
    trailer_url VARCHAR(1000),
    api_source VARCHAR(20) DEFAULT 'omdb',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_rating_imdb CHECK (rating_imdb >= 0 AND rating_imdb <= 10),
    CONSTRAINT valid_rating_rt CHECK (rating_rotten_tomatoes >= 0 AND rating_rotten_tomatoes <= 100),
    CONSTRAINT valid_rating_mc CHECK (rating_metacritic >= 0 AND rating_metacritic <= 100),
    CONSTRAINT valid_year CHECK (release_year >= 1800 AND release_year <= 2100)
);

-- Genres table - Movie genres
CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Movie-Genre junction table (many-to-many)
CREATE TABLE movie_genres (
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

-- Cast and Crew table
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imdb_id VARCHAR(20) UNIQUE,
    name VARCHAR(200) NOT NULL,
    birth_date DATE,
    birth_place VARCHAR(200),
    biography TEXT,
    profile_image_url VARCHAR(1000),
    known_for_department VARCHAR(50),
    api_source VARCHAR(20) DEFAULT 'omdb',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Movie Cast and Crew relationships
CREATE TABLE movie_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL, -- 'actor', 'director', 'writer', 'producer', etc.
    character_name VARCHAR(200), -- For actors
    job_title VARCHAR(100), -- For crew
    credit_order INTEGER, -- Order of appearance in credits
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_role_type CHECK (role_type IN ('actor', 'director', 'writer', 'producer', 'cinematographer', 'editor', 'composer', 'other'))
);

-- Movie posters and images
CREATE TABLE movie_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    image_type VARCHAR(20) NOT NULL, -- 'poster', 'backdrop', 'still', 'logo'
    image_url VARCHAR(1000) NOT NULL,
    width INTEGER,
    height INTEGER,
    aspect_ratio DECIMAL(5,3),
    file_size_kb INTEGER,
    language VARCHAR(10),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_image_type CHECK (image_type IN ('poster', 'backdrop', 'still', 'logo'))
);

-- LLM Generated Movie Cards
CREATE TABLE llm_movie_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    generated_summary TEXT NOT NULL, -- 150-200 words summary
    generated_title VARCHAR(500),
    key_themes TEXT[], -- Array of key themes
    target_audience VARCHAR(100),
    mood_tags TEXT[], -- Array of mood descriptors
    llm_model VARCHAR(50) NOT NULL,
    generation_prompt TEXT,
    generation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quality_score DECIMAL(3,2), -- 0.00 to 1.00
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID, -- Reference to admin user
    approved_at TIMESTAMP,
    
    CONSTRAINT valid_quality_score CHECK (quality_score >= 0 AND quality_score <= 1)
);

-- User management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'moderator'))
);

-- User preferences and favorites
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, movie_id)
);

-- User movie ratings
CREATE TABLE user_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    rating DECIMAL(3,1) NOT NULL,
    review_text TEXT,
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, movie_id),
    CONSTRAINT valid_user_rating CHECK (rating >= 0 AND rating <= 10)
);

-- API usage tracking
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_source VARCHAR(20) NOT NULL,
    endpoint VARCHAR(200) NOT NULL,
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_status INTEGER,
    response_time_ms INTEGER,
    rate_limit_remaining INTEGER,
    error_message TEXT,
    request_ip INET,
    user_id UUID REFERENCES users(id)
);

-- Trending movies cache
CREATE TABLE trending_movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    trend_date DATE NOT NULL,
    trend_rank INTEGER NOT NULL,
    trend_score DECIMAL(10,4),
    trend_source VARCHAR(50), -- 'api', 'calculated', 'manual'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(movie_id, trend_date)
);

-- System configuration
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Performance Indexes
-- Movies table indexes
CREATE INDEX idx_movies_imdb_id ON movies(imdb_id);
CREATE INDEX idx_movies_title ON movies USING gin(to_tsvector('english', title));
CREATE INDEX idx_movies_release_year ON movies(release_year);
CREATE INDEX idx_movies_rating_imdb ON movies(rating_imdb DESC);
CREATE INDEX idx_movies_last_updated ON movies(last_updated);

-- People table indexes
CREATE INDEX idx_people_name ON people USING gin(to_tsvector('english', name));
CREATE INDEX idx_people_imdb_id ON people(imdb_id);

-- Movie credits indexes
CREATE INDEX idx_movie_credits_movie_id ON movie_credits(movie_id);
CREATE INDEX idx_movie_credits_person_id ON movie_credits(person_id);
CREATE INDEX idx_movie_credits_role_type ON movie_credits(role_type);

-- User-related indexes
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_movie_id ON user_favorites(movie_id);
CREATE INDEX idx_user_ratings_user_id ON user_ratings(user_id);
CREATE INDEX idx_user_ratings_movie_id ON user_ratings(movie_id);

-- Trending movies indexes
CREATE INDEX idx_trending_movies_date ON trending_movies(trend_date DESC);
CREATE INDEX idx_trending_movies_rank ON trending_movies(trend_rank);

-- API usage indexes
CREATE INDEX idx_api_usage_timestamp ON api_usage_logs(request_timestamp DESC);
CREATE INDEX idx_api_usage_source ON api_usage_logs(api_source);

-- Insert default genres
INSERT INTO genres (name, description) VALUES
('Action', 'High-energy films with physical stunts and chase scenes'),
('Adventure', 'Exciting journeys and quests'),
('Animation', 'Animated films using various techniques'),
('Biography', 'Films based on real people''s lives'),
('Comedy', 'Films intended to make audiences laugh'),
('Crime', 'Films involving criminal activities'),
('Documentary', 'Non-fiction films about real events'),
('Drama', 'Serious films with emotional themes'),
('Family', 'Films suitable for all family members'),
('Fantasy', 'Films with magical or supernatural elements'),
('History', 'Films set in historical periods'),
('Horror', 'Films intended to frighten and create suspense'),
('Music', 'Films centered around musical performances'),
('Mystery', 'Films involving puzzles or unexplained events'),
('Romance', 'Films focused on love relationships'),
('Sci-Fi', 'Science fiction films with futuristic elements'),
('Sport', 'Films centered around sports activities'),
('Thriller', 'Films designed to keep audiences in suspense'),
('War', 'Films depicting warfare and military conflicts'),
('Western', 'Films set in the American Old West');

-- Insert default system configuration
INSERT INTO system_config (key, value, description) VALUES
('omdb_api_key', '', 'OMDb API key for movie data fetching'),
('tmdb_api_key', '', 'TMDB API key for additional movie data'),
('llm_model', 'gpt-4', 'LLM model used for movie card generation'),
('max_api_requests_per_hour', '1000', 'Maximum API requests per hour'),
('trending_update_frequency', '24', 'Hours between trending movies updates'),
('cache_expiry_hours', '168', 'Hours before cached data expires (1 week)'),
('attribution_text', 'Movie data provided by OMDb API', 'Attribution text for API sources');