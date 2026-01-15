import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  signatures_used: number;
  is_premium: boolean;
  access_key: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid race conditions
          setTimeout(() => fetchProfile(session.user.id), 100);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign up
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    
    // Check if email confirmation is required (auto-confirm is enabled)
    if (!error && data.user && !data.session) {
      setEmailConfirmationPending(true);
    }
    
    return { data, error };
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setProfile(null);
    }
    return { error };
  };

  // Reset password (send email)
  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    return { data, error };
  };

  // Update password (after receiving reset email)
  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    return { data, error };
  };

  // Resend confirmation email
  const resendConfirmationEmail = async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    
    return { data, error };
  };

  // Update signatures used
  const incrementSignaturesUsed = async (count: number = 1) => {
    if (!user || !profile) return;
    
    const newCount = profile.signatures_used + count;
    
    const { error } = await supabase
      .from('profiles')
      .update({ signatures_used: newCount })
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, signatures_used: newCount } : null);
    }
  };

  // Simulate purchase and generate access key
  const simulatePurchase = async () => {
    if (!user) return { success: false, error: 'Not logged in' };

    // Generate unique access key
    const accessKey = `PDFSIGNER-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    try {
      // Create purchase record
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          amount: 2.90,
          access_key: accessKey,
        });

      if (purchaseError) throw purchaseError;

      // Update profile to premium
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_premium: true,
          access_key: accessKey,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update local state immediately
      setProfile(prev => prev ? { ...prev, is_premium: true, access_key: accessKey } : null);

      // Also refetch to ensure consistency
      await fetchProfile(user.id);

      return { success: true, accessKey };
    } catch (error) {
      console.error('Purchase error:', error);
      return { success: false, error: 'Erro ao processar compra' };
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    emailConfirmationPending,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    resendConfirmationEmail,
    incrementSignaturesUsed,
    simulatePurchase,
    refetchProfile: () => user && fetchProfile(user.id),
  };
};
