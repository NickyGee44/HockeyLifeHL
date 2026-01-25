/**
 * Shared password validation rules
 * Must match server-side validation in src/lib/auth/actions.ts
 */

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

export function validatePassword(password: string): PasswordValidationResult {
  const requirements = {
    minLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  // Check each requirement and return specific error
  if (!requirements.minLength) {
    return {
      valid: false,
      error: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`,
      requirements,
    };
  }

  if (!requirements.hasUppercase) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
      requirements,
    };
  }

  if (!requirements.hasLowercase) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
      requirements,
    };
  }

  if (!requirements.hasNumber) {
    return {
      valid: false,
      error: "Password must contain at least one number",
      requirements,
    };
  }

  if (!requirements.hasSpecialChar) {
    return {
      valid: false,
      error: "Password must contain at least one special character (!@#$%^&*...)",
      requirements,
    };
  }

  return {
    valid: true,
    requirements,
  };
}

/**
 * Returns a formatted list of password requirements for display
 */
export function getPasswordRequirementsList(): string[] {
  return [
    `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    "One uppercase letter (A-Z)",
    "One lowercase letter (a-z)",
    "One number (0-9)",
    "One special character (!@#$%^&*...)",
  ];
}
