// Role-Based Access Control Types
export enum Role {
    ADMIN = 'ADMIN',
    COACH = 'COACH',
    CUSTOMER = 'CUSTOMER',
}

export enum StudentType {
    ONE_ON_ONE = '1-1',
    GROUP = 'GROUP',
}

export enum StudentStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    CANCELLED = 'CANCELLED',
}

export enum DemoStatus {
    BOOKED = 'BOOKED',
    ATTENDED = 'ATTENDED',
    NO_SHOW = 'NO_SHOW',
    RESCHEDULED = 'RESCHEDULED',
    CANCELLED = 'CANCELLED',
    INTERESTED = 'INTERESTED',
    NOT_INTERESTED = 'NOT_INTERESTED',
    PAYMENT_PENDING = 'PAYMENT_PENDING',
    CONVERTED = 'CONVERTED',
    DROPPED = 'DROPPED',
}

export enum SubscriptionStatus {
    ACTIVE = 'ACTIVE',
    PAST_DUE = 'PAST_DUE',
    SUSPENDED = 'SUSPENDED',
    CANCELLED = 'CANCELLED',
}

// User Types
export interface Account {
    id: string;
    email: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}

export interface Coach {
    id: string;
    accountId: string;
    name: string;
    bio?: string;
    rating?: number;
    specializations?: string[];
    availability?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Student {
    id: string;
    accountId: string;
    studentName: string;
    studentAge?: number;
    parentName: string;
    parentEmail: string;
    timezone?: string;
    country?: string;
    studentType: StudentType;
    level?: string;
    chessUsernames?: string;
    rating?: number;
    assignedCoachId?: string;
    assignedBatchId?: string;
    status: StudentStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface Batch {
    id: string;
    name: string;
    coachId: string;
    level?: string;
    timezone?: string;
    schedule?: string;
    maxStudents: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Demo {
    id: string;
    studentName: string;
    parentName: string;
    parentEmail: string;
    timezone?: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    coachId?: string;
    adminId?: string;
    meetingLink?: string;
    status: DemoStatus;
    recommendedStudentType?: StudentType;
    recommendedLevel?: string;
    adminNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Plan {
    id: string;
    name: string;
    description?: string;
    amount: number;
    currency: string;
    billingCycle: string;
    studentType: StudentType;
    features?: string[];
    isActive: boolean;
    createdAt: Date;
}

export interface Subscription {
    id: string;
    accountId: string;
    planId: string;
    amount: number;
    billingCycle: string;
    status: SubscriptionStatus;
    startedAt: Date;
    nextDueAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    content: string;
    messageType: 'text' | 'file' | 'system';
    fileUrl?: string;
    isRead: boolean;
    createdAt: Date;
}

export interface ChatRoomMember {
    id: string;
    roomId: string;
    accountId: string;
    role?: string;
    joinedAt: Date;
}
