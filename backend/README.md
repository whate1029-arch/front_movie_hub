# Movie Aggregator Backend API

A comprehensive backend system that implements an LLM-powered tool for movie information aggregation with copyright compliance, user management, and admin functionality.

## Features

- **Movie Data Aggregation**: Integration with OMDb API for movie information
- **LLM-Powered Movie Cards**: AI-generated movie summaries using OpenAI GPT
- **User Management**: Registration, authentication, favorites, and ratings
- **Admin Dashboard**: System monitoring, cache management, and content moderation
- **Copyright Compliance**: Automated content validation and attribution
- **Performance Optimized**: Caching, rate limiting, and database optimization
- **Monitoring & Logging**: Comprehensive API usage tracking and health monitoring

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with security middleware
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for performance optimization
- **Authentication**: JWT-based with role-based access control
- **External APIs**: OMDb API, OpenAI GPT-4
- **Containerization**: Docker with multi-stage builds
- **Logging**: Winston with structured logging

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- OMDb API Key
- OpenAI API Key

### Installation

1. **Clone and setup**:
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**:
   ```bash
   # Create database
   createdb movie_aggregator
   
   # Run migrations
   npm run db:migrate
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Docker Setup

1. **Using Docker Compose**:
   ```bash
   # Production
   docker-compose up -d
   
   # Development
   docker-compose --profile development up -d
   ```

2. **Environment Variables**:
   ```bash
   # Create .env file with required variables
   OMDB_API_KEY=your_omdb_key
   OPENAI_API_KEY=your_openai_key
   JWT_SECRET=your_jwt_secret
   ```

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Public Endpoints

#### Movies
- `GET /movies/trending` - Get trending movies
- `GET /movies/search?q=query` - Search movies
- `GET /movies/:id` - Get movie by ID
- `GET /movies/:id/card` - Get LLM-generated movie card

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

#### System
- `GET /health` - Health check
- `GET /` - API information

### Authenticated Endpoints

#### User Management
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `GET /user/favorites` - Get user favorites
- `POST /user/favorites/:movieId` - Add to favorites
- `DELETE /user/favorites/:movieId` - Remove from favorites
- `POST /user/ratings` - Rate a movie
- `GET /user/recommendations` - Get personalized recommendations
- `GET /user/stats` - Get user statistics

#### Movie Operations
- `POST /movies/:id/card` - Generate movie card
- `POST /movies/cards/batch` - Batch generate cards

### Admin Endpoints

#### Dashboard & Monitoring
- `GET /admin/dashboard` - Admin dashboard data
- `GET /admin/system/health` - System health check
- `GET /admin/api-usage` - API usage statistics

#### Content Management
- `POST /admin/trending/update` - Update trending movies
- `POST /admin/movies/batch-generate-cards` - Batch generate movie cards

#### System Management
- `POST /admin/cache/clear` - Clear system caches
- `POST /admin/system/restart-services` - Restart services

#### Copyright Management
- `GET /admin/copyright/report` - Copyright compliance report
- `POST /admin/copyright/sources` - Manage copyright sources

### External API Endpoints

Require API key in `x-api-key` header:
- `GET /external/movies/trending` - External access to trending movies
- `GET /external/movies/:id` - External access to movie data

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `OMDB_API_KEY` | OMDb API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `API_KEY` | External API access key | - |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |

### Database Schema

The system uses PostgreSQL with the following main tables:
- `movies` - Movie information
- `genres` - Movie genres
- `people` - Cast and crew
- `movie_credits` - Movie-person relationships
- `llm_movie_cards` - AI-generated movie cards
- `users` - User accounts
- `user_favorites` - User favorite movies
- `user_ratings` - User movie ratings
- `api_usage_logs` - API usage tracking

## Development

### Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking
```

### Project Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models and validation
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── app.ts          # Express app configuration
│   └── server.ts       # Server entry point
├── database/
│   ├── schema.sql      # Database schema
│   └── migrations/     # Database migrations
├── logs/               # Application logs
├── tests/              # Test files
└── docker-compose.yml  # Docker configuration
```

## Monitoring & Logging

### Health Checks

The system provides comprehensive health checks:
- Database connectivity
- Redis connectivity
- External API availability
- Service health status

### Logging

Structured logging with Winston:
- Console output for development
- File output for production
- Separate error and exception logs
- Request/response logging
- API usage tracking

### Metrics

- API response times
- Database query performance
- Cache hit/miss rates
- External API usage
- Error rates and types

## Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (user/admin)
- Token expiration and refresh
- Rate limiting on auth endpoints

### API Security
- Helmet.js security headers
- CORS configuration
- Request rate limiting
- Input validation with Zod
- SQL injection prevention

### Data Protection
- Password hashing with bcrypt
- Environment variable protection
- Secure cookie handling
- API key validation

## Performance

### Caching Strategy
- Redis caching for API responses
- LLM response caching (24h TTL)
- Movie data caching (1h TTL)
- Search result caching (24h TTL)

### Database Optimization
- Connection pooling
- Query optimization
- Proper indexing
- Prepared statements

### Rate Limiting
- General API: 100 requests/15min
- Authentication: 5 requests/15min
- Admin endpoints: Enhanced protection

## Deployment

### Production Deployment

1. **Environment Setup**:
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export DATABASE_URL=postgresql://...
   export REDIS_URL=redis://...
   ```

2. **Build and Deploy**:
   ```bash
   npm run build
   npm start
   ```

3. **Docker Deployment**:
   ```bash
   docker-compose up -d
   ```

### Monitoring

- Health check endpoint: `/health`
- Admin dashboard: `/api/admin/dashboard`
- System metrics: `/api/admin/system/health`

## API Usage Examples

### Register and Login
```javascript
// Register
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'moviefan',
    email: 'fan@movies.com',
    password: 'securepassword'
  })
});

// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'fan@movies.com',
    password: 'securepassword'
  })
});

const { token } = await loginResponse.json();
```

### Get Trending Movies
```javascript
const movies = await fetch('/api/movies/trending', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Generate Movie Card
```javascript
const card = await fetch('/api/movies/tt1234567/card', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    includeImages: true,
    summaryLength: 'medium'
  })
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the logs for error details

## Changelog

### v1.0.0
- Initial release
- Movie data aggregation
- LLM-powered movie cards
- User management
- Admin dashboard
- Copyright compliance
- Performance optimization