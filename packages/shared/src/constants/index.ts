// Application Constants

export const APP_NAME = 'ICA Operations Platform';
export const APP_VERSION = '0.0.1';

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Rate Limiting
export const RATE_LIMIT_REQUESTS = 100;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const LOGIN_ATTEMPTS_LIMIT = 5;
export const LOGIN_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// JWT
export const JWT_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';

// File Upload
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.chess-pgn',
];

// Chess Levels
export const CHESS_LEVELS = [
    'Beginner',
    'Elementary',
    'Intermediate',
    'Advanced',
    'Expert',
    'Master',
] as const;

// Billing Cycles
export const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;

// Permissions
export const PERMISSIONS = {
    ADMIN: ['*'],
    COACH: [
        'demo:view:assigned',
        'student:view:assigned',
        'batch:view:assigned',
        'chat:batch',
        'chat:admin',
        'calendar:manage',
    ],
    CUSTOMER: [
        'student:view:own',
        'schedule:view',
        'chat:batch',
        'chat:admin',
        'payment:view:own',
    ],
} as const;
