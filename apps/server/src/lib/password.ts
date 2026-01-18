// Password hashing utilities using Argon2
// Bun has native support for Argon2 through the 'bun:password' module

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 65536, // 64 MB
    timeCost: 3, // Number of iterations
  });
}

// Verify a password against a hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(password, hash);
  } catch {
    return false;
  }
}

// Password validation rules
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be at most 128 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Generate a random password (for admin-created accounts)
export function generateRandomPassword(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomByte = randomBytes[i];
    if (randomByte !== undefined) {
      password += chars[randomByte % chars.length];
    }
  }

  // Ensure password meets requirements
  const validation = validatePassword(password);
  if (!validation.valid) {
    // Recursively generate until valid
    return generateRandomPassword(length);
  }

  return password;
}
