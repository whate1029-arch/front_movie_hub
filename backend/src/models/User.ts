export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFavorite {
  id: string;
  userId: string;
  movieId: string;
  createdAt: Date;
}

export interface UserRating {
  id: string;
  userId: string;
  movieId: string;
  rating: number;
  reviewText?: string;
  ratedAt: Date;
  updatedAt: Date;
}