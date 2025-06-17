import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getCurrentUser, getProfile, createProfile, Profile } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: existingProfile, error } = await getProfile(userId);
      
      if (!existingProfile && !error) {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await createProfile({
          user_id: userId,
          reputation_score: 0,
          community_role: 'member',
          notification_radius: 1000,
          language_preference: 'en'
        });
        
        if (createError) {
          console.error('Error creating profile:', createError);
        } else {
          setProfile(newProfile);
        }
      } else if (!error && existingProfile) {
        setProfile(existingProfile);
      } else if (error) {
        console.error('Error loading profile:', error);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
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
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setSession(null);
      
      return { error: null };
    } catch (error: any) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<Profile>) => {
    if (!user) return { data: null, error: new Error('No user logged in') };
    
    try {
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
      return { data: null, error };
    }
  };

  return {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateUserProfile,
    isAuthenticated: !!user,
    isAnonymous: !user
  };
};