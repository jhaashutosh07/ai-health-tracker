// Shared password policy used by registration and password reset.
// Health data is sensitive, so we require a reasonable minimum strength.
export const PASSWORD_MIN_LENGTH = 8

export function validatePassword(password: unknown): { valid: boolean; message?: string } {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password is required' }
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` }
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must include both letters and numbers' }
  }
  return { valid: true }
}
