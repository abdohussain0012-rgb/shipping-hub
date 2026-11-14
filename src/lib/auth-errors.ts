// Turns Supabase's English error messages into short codes, and codes into Arabic text for the screen.

export function loginErrorCode(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'invalid';
  if (m.includes('email not confirmed')) return 'unconfirmed';
  if (m.includes('invalid api key') || m.includes('fetch failed') || m.includes('failed to fetch')) return 'config';
  if (m.includes('rate limit') || m.includes('too many')) return 'ratelimit';
  return 'other';
}

export const LOGIN_MESSAGES: Record<string, string> = {
  invalid:
    'الإيميل أو كلمة المرور غلط. لو لسه ما حددتش كلمة مرور من رابط الدعوة، اختار "نسيت كلمة المرور؟" واطلب رابط جديد.',
  unconfirmed: 'الحساب لسه ما اتفعّلش. افتح رابط الدعوة اللي وصلك على الإيميل.',
  config: 'إعدادات الاتصال بـ Supabase ناقصة أو غلط. راجع ملف .env.local وأعد تشغيل التطبيق.',
  ratelimit: 'محاولات كتير في وقت قصير. استنى كم دقيقة وحاول تاني.',
  expired: 'الرابط ده منتهي أو اتستخدم قبل كده. اطلب رابط جديد.',
  other: 'حصلت مشكلة في تسجيل الدخول. حاول تاني.',
};

// Reads a message by key. Uses hasOwnProperty so a key like "constructor" cannot return an inherited value.
export function messageFor(map: Record<string, string>, key: string | undefined, fallback?: string): string | null {
  if (!key) return null;
  if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
  return fallback ?? null;
}
