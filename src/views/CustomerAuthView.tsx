import React, { useEffect, useState } from 'react';
import { SignInView } from './SignInView';
import { SignUpView } from './SignUpView';
import type { AppView } from '../components/Navbar';

interface CustomerAuthViewProps {
  initialMode?: 'signup' | 'login';
  authRole?: 'customer' | 'technician';
  onSuccessRedirect: (
    role: 'customer' | 'technician' | 'admin',
    isNewLocationNeeded: boolean
  ) => void;
  onNavigate: (view: AppView, sectionId?: string) => void;
}

export const CustomerAuthView: React.FC<CustomerAuthViewProps> = ({
  initialMode = 'signup',
  authRole = 'customer',
  onNavigate,
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>(
    authRole === 'technician' ? 'login' : initialMode
  );

  useEffect(() => {
    setMode(authRole === 'technician' ? 'login' : initialMode);
  }, [initialMode, authRole]);

  if (mode === 'login' || authRole === 'technician') {
    return (
      <SignInView
        authRole={authRole}
        onSwitchToSignUp={() => setMode('signup')}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <SignUpView
      onSwitchToSignIn={() => setMode('login')}
      onNavigate={onNavigate}
    />
  );
};
