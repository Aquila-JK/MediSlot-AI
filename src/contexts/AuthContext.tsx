import React, { createContext, useContext, useEffect, useState } from 'react';
import { testConnection } from '../lib/firebase.ts';
import { PortalMode, UserPrivateInfo, UserProfile } from '../types.ts';
import {
  ensureLocalWorkspaceReady,
  getUserPrivateInfo,
  LOCAL_WORKSPACE_UID,
} from '../services/firestoreService.ts';
import {
  getCurrentUser,
  setCurrentUser,
  loginUser,
  registerUser,
  forgotPassword as authForgotPassword,
  resetPassword as authResetPassword,
  UserAccount,
} from '../services/authService.ts';

interface AuthContextValue {
  user: UserAccount | null;
  workspaceUid: string;
  enteredPortal: boolean;
  profile: UserProfile;
  privateInfo: UserPrivateInfo | null;
  activePortal: PortalMode;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserAccount>;
  register: (params: { name: string; email: string; password: string; role?: PortalMode }) => Promise<UserAccount>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, newPass: string) => Promise<void>;
  enterPortal: (portal: PortalMode) => void;
  switchPortal: (portal: PortalMode) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PORTAL_STORAGE_KEY = 'medislot_preferred_portal';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setLocalCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [activePortal, setActivePortal] = useState<PortalMode>(() => {
    const saved = sessionStorage.getItem(PORTAL_STORAGE_KEY) || localStorage.getItem(PORTAL_STORAGE_KEY);
    if (saved === 'clinical' || saved === 'patient') return saved;
    return currentUser?.role || 'patient';
  });
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const enteredPortal = Boolean(currentUser);
  const workspaceUid = currentUser ? currentUser.id : LOCAL_WORKSPACE_UID;

  const profile: UserProfile = {
    uid: workspaceUid,
    displayName: currentUser ? currentUser.name : (activePortal === 'clinical' ? 'Dr. Sarah Jenkins' : 'Eleanor Vance'),
    activePortal,
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      testConnection();
      ensureLocalWorkspaceReady();
      const priv = await getUserPrivateInfo(workspaceUid);
      if (mounted) {
        if (currentUser) {
          setPrivateInfo({
            uid: currentUser.id,
            email: currentUser.email,
            phone: currentUser.phone || '+1 (555) 019-2834',
            mrn: currentUser.mrn,
            bloodType: 'O+',
            address: '450 Meridian Parkway, Pavilion B',
          });
        } else {
          setPrivateInfo(priv);
        }
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [workspaceUid, currentUser]);

  const login = async (email: string, pass: string): Promise<UserAccount> => {
    const account = await loginUser(email, pass);
    setLocalCurrentUser(account);
    const targetPortal = account.role || 'patient';
    setActivePortal(targetPortal);
    localStorage.setItem(PORTAL_STORAGE_KEY, targetPortal);
    sessionStorage.setItem(PORTAL_STORAGE_KEY, targetPortal);
    return account;
  };

  const register = async (params: {
    name: string;
    email: string;
    password: string;
    role?: PortalMode;
  }): Promise<UserAccount> => {
    const account = await registerUser(params);
    setLocalCurrentUser(account);
    const targetPortal = account.role || params.role || 'patient';
    setActivePortal(targetPortal);
    localStorage.setItem(PORTAL_STORAGE_KEY, targetPortal);
    sessionStorage.setItem(PORTAL_STORAGE_KEY, targetPortal);
    return account;
  };

  const forgotPassword = async (email: string) => {
    return authForgotPassword(email);
  };

  const resetPassword = async (email: string, newPass: string) => {
    return authResetPassword(email, newPass);
  };

  const enterPortal = (portal: PortalMode) => {
    ensureLocalWorkspaceReady();
    sessionStorage.setItem(PORTAL_STORAGE_KEY, portal);
    setActivePortal(portal);
  };

  const switchPortal = (portal: PortalMode) => {
    sessionStorage.setItem(PORTAL_STORAGE_KEY, portal);
    localStorage.setItem(PORTAL_STORAGE_KEY, portal);
    setActivePortal(portal);
  };

  const logout = () => {
    setCurrentUser(null);
    setLocalCurrentUser(null);
    sessionStorage.removeItem(PORTAL_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        workspaceUid,
        enteredPortal,
        profile,
        privateInfo,
        activePortal,
        loading,
        login,
        register,
        forgotPassword,
        resetPassword,
        enterPortal,
        switchPortal,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
