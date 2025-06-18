import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getCurrentUser, getProfile, createProfile, Profile } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we're currently creating a profile to prevent race conditions
  const [creatingProfile, setCreatingProfile] = useState(false);

  const loadUserProfile = useCallback(async (userId: string, mounted: { current: boolean }) => {
    if (!mounted.current) return;
    
    try {
      const { data: existingProfile, error } = await getProfile(userId);
      
      if (!mounted.current) return;
      
      if (!existingProfile && !error && !creatingProfile) {
        // Profile doesn't exist, create one
        console.log('Creating new profile for user:', userId);
        setCreatingProfile(true);
        
        const { data: newProfile, error: createError } = await createProfile({
          user_id: userId,
          reputation_score: 0,
          community_role: 'member',
          notification_radius: 1000,
          language_preference: 'en'
        });
        
        if (!mounted.current) return;
        
        setCreatingProfile(false);
        
        if (createError) {
          console.error('Error creating profile:', createError);
          setError('Failed to create user profile');
        } else {
          console.log('Profile created successfully:', newProfile);
          setProfile(newProfile);
        }
      } else if (!error && existingProfile) {
        console.log('Profile loaded successfully:', existingProfile);
        setProfile(existingProfile);
      } else if (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load user profile');
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      if (mounted.current) {
        setError('Failed to load user profile');
        setCreatingProfile(false);
      }
    }
  }, [creatingProfile]);

  useEffect(() => {
    const mounted = { current: true };

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted.current) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setError('Failed to get session');
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id, mounted);
        }
        
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted.current) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return;
        
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Clear any previous errors
        setError(null);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id, mounted);
        } else {
          setProfile(null);
          setCreatingProfile(false);
        }
        
        // Set loading to false after handling auth state change
        if (mounted.current) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error: any) {
      setError(error.message || 'Sign up failed');
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error: any) {
      setError(error.message || 'Sign in failed');
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear state immediately
      setUser(null);
      setProfile(null);
      setSession(null);
      setCreatingProfile(false);
      
      return { error: null };
    } catch (error: any) {
      setError(error.message || 'Sign out failed');
      return { error };
    }
  };

  const updateUserProfile = async (updates: Partial<Profile>) => {
    if (!user) return { data: null, error: new Error('No user logged in') };
    
    try {
      setError(null);
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      return { data, error: null };
    } catch (error: any) {
      setError(error.message || 'Profile update failed');
      return { data: null, error };
    }
  };

  return {
    user,
    profile,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateUserProfile,
    isAuthenticated: !!user,
    isAnonymous: !user
  };
};