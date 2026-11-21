import { PortalMode } from '../types.ts';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: PortalMode;
  mrn: string;
  phone?: string;
  createdAt: string;
}

const USERS_STORAGE_KEY = 'medislot_registered_users_v2';
const CURRENT_SESSION_KEY = 'medislot_current_session_v2';
const SALT = 'medislot_enterprise_salt_2026_clinical_auth';

// Cryptographic SHA-256 hashing (Never stores plain-text passwords)
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${SALT}:${plainText.trim()}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback hash simulation if Web Crypto is unavailable in node/test env
  let hash = 0;
  const str = `${SALT}:${plainText.trim()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

// Initial pre-registered demo accounts
const SEED_USERS_RAW = [
  {
    id: 'usr_eleanor_vance',
    name: 'Eleanor Vance',
    email: 'patient@medislot.com',
    plainPass: 'Patient@123',
    role: 'patient' as PortalMode,
    mrn: 'MRN-84920',
    phone: '+1 (415) 555-0194',
  },
  {
    id: 'usr_dr_jenkins',
    name: 'Dr. Sarah Jenkins',
    email: 'doctor@medislot.com',
    plainPass: 'Doctor@123',
    role: 'clinical' as PortalMode,
    mrn: 'MRN-DOC01',
    phone: '+1 (415) 555-0188',
  },
];

async function getStoredUsers(): Promise<UserAccount[]> {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // Initialize with seeded accounts hashed securely
  const seeded: UserAccount[] = [];
  for (const item of SEED_USERS_RAW) {
    const passwordHash = await hashPassword(item.plainPass);
    seeded.push({
      id: item.id,
      name: item.name,
      email: item.email.toLowerCase(),
      passwordHash,
      role: item.role,
      mrn: item.mrn,
      phone: item.phone,
      createdAt: new Date().toISOString(),
    });
  }

  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    // ignore
  }
  return seeded;
}

function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY) || sessionStorage.getItem(CURRENT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserAccount | null, rememberMe = true): void {
  try {
    if (!user) {
      localStorage.removeItem(CURRENT_SESSION_KEY);
      sessionStorage.removeItem(CURRENT_SESSION_KEY);
    } else {
      const serialized = JSON.stringify(user);
      if (rememberMe) {
        localStorage.setItem(CURRENT_SESSION_KEY, serialized);
      }
      sessionStorage.setItem(CURRENT_SESSION_KEY, serialized);
    }
  } catch {
    // ignore
  }
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  role?: PortalMode;
}): Promise<UserAccount> {
  const { name, email, password, role = 'patient' } = params;
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Please enter your full legal name (minimum 2 characters).');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const users = await getStoredUsers();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('An account is already registered with this email address. Please sign in instead.');
  }

  const passwordHash = await hashPassword(password);
  const safeRandom = Math.random().toString(36).substring(2, 8);
  const newUser: UserAccount = {
    id: `usr_${Date.now()}_${safeRandom}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role,
    mrn: `MRN-${Math.floor(10000 + Math.random() * 90000)}`,
    phone: '+1 (555) 019-2834',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveStoredUsers(users);
  setCurrentUser(newUser, true);

  return newUser;
}

export async function loginUser(email: string, plainPass: string): Promise<UserAccount> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your registered email address.');
  }
  if (!plainPass) {
    throw new Error('Please enter your account password.');
  }

  const users = await getStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    throw new Error('No account found with this email address. Please check your spelling or create an account.');
  }

  const computedHash = await hashPassword(plainPass);
  if (computedHash !== user.passwordHash) {
    throw new Error('Incorrect password. Please verify your credentials and try again.');
  }

  setCurrentUser(user, true);
  return user;
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your email address to reset your password.');
  }

  const users = await getStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    throw new Error('We could not find an active account with that email address.');
  }

  return {
    success: true,
    message: `Password reset verification has been confirmed for ${cleanEmail}. You may now set a new password.`,
  };
}

export async function resetPassword(email: string, newPass: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!newPass || newPass.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const users = await getStoredUsers();
  const index = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  if (index === -1) {
    throw new Error('User account not found.');
  }

  const newHash = await hashPassword(newPass);
  users[index].passwordHash = newHash;
  saveStoredUsers(users);
}
