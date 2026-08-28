import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { UserRole } from '@/types/database';

const JWT_SECRET = process.env.JWT_SECRET || 'td_mobile_store_super_secret_key_2026_jwt';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (err) {
    return null;
  }
}

export function getUserFromRequest(request: NextRequest): AuthUser | null {
  // Check cookie first
  const cookieToken = request.cookies.get('td_auth_token')?.value;
  if (cookieToken) {
    const user = verifyToken(cookieToken);
    if (user) return user;
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  return null;
}

export function canViewSensitiveFinancials(role?: UserRole): boolean {
  if (!role) return false;
  return ['admin', 'owner', 'manager'].includes(role);
}

export function canManageUsers(role?: UserRole): boolean {
  if (!role) return false;
  return ['admin', 'owner'].includes(role);
}
