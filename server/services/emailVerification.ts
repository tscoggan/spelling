interface VerificationEntry {
  code: string;
  email: string;
  userId: number;
  attempts: number;
  expiresAt: Date;
}

const verificationCodes = new Map<number, VerificationEntry>();

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeVerificationCode(userId: number, email: string, code: string): void {
  verificationCodes.set(userId, {
    code,
    email,
    userId,
    attempts: 0,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
}

export type VerifyResult = "valid" | "invalid" | "expired" | "too_many_attempts";

export function verifyCode(userId: number, inputCode: string): VerifyResult {
  const entry = verificationCodes.get(userId);
  if (!entry) return "expired";
  if (new Date() > entry.expiresAt) {
    verificationCodes.delete(userId);
    return "expired";
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    verificationCodes.delete(userId);
    return "too_many_attempts";
  }
  if (entry.code !== inputCode.trim()) {
    entry.attempts++;
    return "invalid";
  }
  verificationCodes.delete(userId);
  return "valid";
}
