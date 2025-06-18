import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getCurrentUser, getProfile, createProfile, Profile } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track state without causing re-renders
  const creatingProfileRef = useRef(false);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  // Memoize the profile loading function - no dependencies to prevent recreations
  const loadUserProfile = useCallback(async (userId: string) => {
    if (!mountedRef.current || creatingProfileRef.current) return;
    
    try {
      const { data: existingProfile, error } = await getProfile(userId);
      
      if (!mountedRef.current) return;
      
      if (!existingProfile && !error && !creatingProfileRef.current) {
        // Profile doesn't exist, create one
        console.log('Creating new profile for user:', userId);
        creatingProfileRef.current = true;
        
        const { data: newProfile, error: createError } = await createProfile({
          user_id: userId,
          reputation_score: 0,
          community_role: 'member',
          notification_radius: 1000,
          language_preference: 'en'
        });
        
        creatingProfileRef.current = false;
        
        if (!mountedRef.current) return;
        
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
      creatingProfileRef.current = false;
      if (mountedRef.current) {
        setError('Failed to load user profile');
      }
    }
  }, []); // Empty dependency array - function never recreates

  useEffect(() => {
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setError('Failed to get session');
          setLoading(false);
          return;
        }

        // Set initial state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Load profile if user exists
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
        
        setLoading(false);
        initializedRef.current = true;
        
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        if (mountedRef.current) {
          setError('Failed to initialize authentication');
          setLoading(false);
        }
      }
    };

    const setupAuthListener = () => {
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mountedRef.current) return;
          
          console.log('Auth state changed:', event, session?.user?.id);
          
          // Skip initial session events if we've already initialized
          if (event === 'INITIAL_SESSION' && initializedRef.current) {
            return;
          }
          
          // Clear any previous errors
          setError(null);
          
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await loadUserProfile(session.user.id);
          } else {
            setProfile(null);
            creatingProfileRef.current = false;
          }
          
          // Set loading to false after handling auth state change
          if (mountedRef.current && !initializedRef.current) {
            setLoading(false);
            initializedRef.current = true;
          }
        }
      );
      
      authSubscription = subscription;
    };

    // Initialize auth and setup listener
    initializeAuth();
    setupAuthListener();

    return () => {
      mountedRef.current = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
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
      creatingProfileRef.current = false;
      
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