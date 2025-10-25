export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  score: number;
}

export class PasswordValidator {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;
  
  private static readonly COMMON_PASSWORDS = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
    'qwerty123', 'dragon', 'master', 'hello', 'login', 'passw0rd',
    'sunshine', 'princess', 'azerty', 'trustno1', 'football', 'charlie',
    'aa123456', 'donald', 'password1', 'qwerty1', 'zaq12wsx', 'iloveyou'
  ];

  private static readonly PATTERNS = {
    lowercase: /[a-z]/,
    uppercase: /[A-Z]/,
    numbers: /[0-9]/,
    symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    repeating: /(.)\1{2,}/,
    sequential: /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i,
    keyboard: /(qwerty|asdfgh|zxcvbn|qwertz|azerty)/i,
    personal: /(name|email|phone|birth|address)/i,
  };

  /**
   * Validate password strength and security
   */
  static validatePassword(password: string, userInfo?: { email?: string; firstName?: string; lastName?: string }): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Check length
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    } else if (password.length >= this.MIN_LENGTH) {
      score += 1;
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
    }

    // Check for lowercase letters
    if (!this.PATTERNS.lowercase.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    // Check for uppercase letters
    if (!this.PATTERNS.uppercase.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    // Check for numbers
    if (!this.PATTERNS.numbers.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    // Check for symbols
    if (!this.PATTERNS.symbols.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    // Check for common passwords
    if (this.COMMON_PASSWORDS.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a more unique password');
      score -= 2;
    }

    // Check for repeating characters
    if (this.PATTERNS.repeating.test(password)) {
      errors.push('Password should not contain repeating characters');
      score -= 1;
    }

    // Check for sequential characters
    if (this.PATTERNS.sequential.test(password)) {
      errors.push('Password should not contain sequential characters');
      score -= 1;
    }

    // Check for keyboard patterns
    if (this.PATTERNS.keyboard.test(password)) {
      errors.push('Password should not contain keyboard patterns');
      score -= 1;
    }

    // Check against user information
    if (userInfo) {
      const userInfoValues = [
        userInfo.email?.split('@')[0],
        userInfo.firstName,
        userInfo.lastName,
      ].filter(Boolean);

      for (const info of userInfoValues) {
        if (info && password.toLowerCase().includes(info.toLowerCase())) {
          errors.push('Password should not contain personal information');
          score -= 2;
          break;
        }
      }
    }

    // Additional scoring for length
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (password.length >= 20) score += 1;

    // Bonus for character diversity
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 1;

    // Determine strength
    let strength: PasswordValidationResult['strength'];
    if (score <= 2) {
      strength = 'weak';
    } else if (score <= 4) {
      strength = 'medium';
    } else if (score <= 6) {
      strength = 'strong';
    } else {
      strength = 'very_strong';
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.max(0, score),
    };
  }

  /**
   * Legacy validate method for backward compatibility
   */
  static validate(password: string): { isValid: boolean; message?: string } {
    const result = this.validatePassword(password);
    return {
      isValid: result.isValid,
      message: result.errors[0],
    };
  }

  /**
   * Legacy getStrengthScore method for backward compatibility
   */
  static getStrengthScore(password: string): number {
    const result = this.validatePassword(password);
    return Math.min(100, (result.score / 8) * 100);
  }

  /**
   * Generate secure password
   */
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check password entropy
   */
  static calculateEntropy(password: string): number {
    const charSets = [
      { regex: /[a-z]/, size: 26 },
      { regex: /[A-Z]/, size: 26 },
      { regex: /[0-9]/, size: 10 },
      { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, size: 32 },
    ];

    let charsetSize = 0;
    for (const charset of charSets) {
      if (charset.regex.test(password)) {
        charsetSize += charset.size;
      }
    }

    return password.length * Math.log2(charsetSize);
  }

  /**
   * Check if password has been compromised (placeholder for actual breach check)
   */
  static async checkPasswordBreach(password: string): Promise<boolean> {
    // This would integrate with services like HaveIBeenPwned
    // For now, return false (not breached)
    return false;
  }

  /**
   * Generate password strength meter data
   */
  static getPasswordStrengthMeter(password: string): {
    score: number;
    maxScore: number;
    percentage: number;
    feedback: string[];
    color: string;
  } {
    const result = this.validatePassword(password);
    const maxScore = 8;
    const percentage = Math.min(100, (result.score / maxScore) * 100);
    
    const feedback: string[] = [];
    
    if (password.length < 12) {
      feedback.push('Use at least 12 characters for better security');
    }
    
    if (!/[a-z]/.test(password)) {
      feedback.push('Add lowercase letters');
    }
    
    if (!/[A-Z]/.test(password)) {
      feedback.push('Add uppercase letters');
    }
    
    if (!/[0-9]/.test(password)) {
      feedback.push('Add numbers');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Add special characters');
    }

    let color: string;
    if (percentage < 25) {
      color = '#ff4444';
    } else if (percentage < 50) {
      color = '#ff8800';
    } else if (percentage < 75) {
      color = '#ffaa00';
    } else {
      color = '#00aa00';
    }

    return {
      score: result.score,
      maxScore,
      percentage,
      feedback,
      color,
    };
  }
}