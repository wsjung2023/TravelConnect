// 사용자 객체에서 민감 필드(password 등)를 제거해 응답에 안전하게 노출하기 위한 헬퍼
export function sanitizeUser<T extends Record<string, any> | null | undefined>(user: T): T {
  if (!user) return user;
  const { password, passwordHash, ...rest } = user as any;
  return rest as T;
}

export function sanitizeUsers<T extends Record<string, any>>(users: T[]): T[] {
  return users.map((u) => sanitizeUser(u));
}
