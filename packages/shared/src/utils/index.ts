// Utility functions

/**
 * Format a date to a localized string
 */
export function formatDate(date: Date | string, locale = 'en-IN'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string, locale = 'en-IN'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Generate a chat room ID
 */
export function generateChatRoomId(type: 'batch' | 'dm', ...ids: string[]): string {
    if (type === 'batch') {
        return `batch:${ids[0]}`;
    }
    // Sort IDs for consistent room naming
    const sortedIds = ids.sort();
    return `dm:${sortedIds.join(':')}`;
}

/**
 * Mask sensitive information (email/phone)
 */
export function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';
    const maskedLocal = local.slice(0, 2) + '***';
    return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
    if (phone.length < 4) return '****';
    return '****' + phone.slice(-4);
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
    userRole: string,
    requiredPermission: string,
    permissions: Record<string, string[]>
): boolean {
    const rolePermissions = permissions[userRole] || [];
    if (rolePermissions.includes('*')) return true;
    return rolePermissions.includes(requiredPermission);
}
