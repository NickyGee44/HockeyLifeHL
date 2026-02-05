'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { LoginModal } from './LoginModal';
import { SignupModal } from './SignupModal';

interface AuthContextValue {
  openLogin: () => void;
  openSignup: () => void;
  closeModals: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const openLogin = useCallback(() => {
    setShowSignup(false);
    setShowLogin(true);
  }, []);

  const openSignup = useCallback(() => {
    setShowLogin(false);
    setShowSignup(true);
  }, []);

  const closeModals = useCallback(() => {
    setShowLogin(false);
    setShowSignup(false);
  }, []);

  const handleLoginSuccess = () => {
    closeModals();
    // Refresh the page to update the user state across all components
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ openLogin, openSignup, closeModals }}>
      {children}

      <LoginModal
        isOpen={showLogin}
        onClose={closeModals}
        onSignupClick={openSignup}
        onSuccess={handleLoginSuccess}
      />

      <SignupModal
        isOpen={showSignup}
        onClose={closeModals}
        onLoginClick={openLogin}
      />
    </AuthContext.Provider>
  );
}
