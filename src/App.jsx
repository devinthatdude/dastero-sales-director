// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import AppShell from './components/AppShell';

export default function App(){
  const { session, profile, isAdmin, loading, signOut } = useAuth();
  if(loading) return <div className="min-h-screen flex items-center justify-center dim">Loading…</div>;
  if(!session) return <Login/>;
  return <AppShell profile={profile} isAdmin={isAdmin} onSignOut={signOut} />;
}
