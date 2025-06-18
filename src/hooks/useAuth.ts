import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getCurrentUser, getProfile, createProfile, Profile } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      console.log('Loading profile for user:', userId);
      
      const { data: existingProfile, error } = await getProfile(userId);
      
      if (!existingProfile && !error) {
        // Profile doesn't exist, create one
        console.log('Creating new profile...');
        
        const { data: newProfile, error: createError } = await createProfile({
          user_id: userId,
          reputation_score: 0,
          community_role: 'member',
          notification_radius: 1000,
          language_preference: 'en'
        });
        
        if (createError) {
          console.error('Error creating profile:', createError);
          setError('Failed to create user profile');
          return null;
        } else {
          console.log('Profile created successfully');
          setProfile(newProfile);
          return newProfile;
        }
      } else if (!error && existingProfile) {
        console.log('Profile loaded successfully');
        setProfile(existingProfile);
        return existingProfile;
      } else if (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load user profile');
        return null;
      }
    } catch (error) {
      console.error('Error in loadProfile:', error);
      setError('Failed to load user profile');
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        setLoading(true);
        setError(null);
        
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to get session');
          setLoading(false);
          return;
        }

        console.log('Initial session:', session?.user?.id || 'No session');
        
        // Set initial state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Load profile if user exists
        if (session?.user) {
          await loadProfile(session.user.id);
        }
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const setupAuthListener = () => {
      // Set up auth listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;
          
          console.log('Auth state changed:', event, session?.user?.id || 'No user');
          
          try {
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
              await loadProfile(session.user.id);
            } else {
              setProfile(null);
            }
          } catch (error) {
            console.error('Error handling auth state change:', error);
            setError('Authentication state change failed');
          }
        }
      );
      
      authSubscription = subscription;
    };

    // Initialize auth and setup listener
    initializeAuth().then(() => {
      if (mounted) {
        setupAuthListener();
      }
    });

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [loadProfile]);

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
      const errorMessage = error.message || 'Sign up failed';
      setError(errorMessage);
      return { data: null, error: { message: errorMessage } };
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
      const errorMessage = error.message || 'Sign in failed';
      setError(errorMessage);
      return { data: null, error: { message: errorMessage } };
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
      
      return { error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'Sign out failed';
      setError(errorMessage);
      return { error: { message: errorMessage } };
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
      const errorMessage = error.message || 'Profile update failed';
      setError(errorMessage);
      return { data: null, error: { message: errorMessage } };
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