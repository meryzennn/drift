import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';

interface UsernameCheckResult {
  isChecking: boolean;
  isAvailable: boolean | null;
  suggestions: string[];
}

export function useUsernameCheck(username: string, originalUsername?: string): UsernameCheckResult {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset state if empty or unchanged from original
    if (!username || username === originalUsername) {
      setIsChecking(false);
      setIsAvailable(null);
      setSuggestions([]);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    setIsChecking(true);
    setIsAvailable(null);
    setSuggestions([]);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        // 1. Check if the username is taken
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (error) {
          console.error("Error checking username:", error);
          setIsAvailable(null);
          setIsChecking(false);
          return;
        }

        if (!data) {
          // Available!
          setIsAvailable(true);
        } else {
          // Taken!
          setIsAvailable(false);
          
          // Generate suggestions
          const newSuggestions = await generateSuggestions(username);
          setSuggestions(newSuggestions);
        }
      } catch (err) {
        console.error("Username check failed", err);
      } finally {
        setIsChecking(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [username, originalUsername]);

  const generateSuggestions = async (base: string): Promise<string[]> => {
    // Generate 5 candidates
    const candidates = [
      `${base}_${Math.floor(Math.random() * 99)}`,
      `${base}${Math.floor(Math.random() * 999)}`,
      `${base}web3`,
      `${base}sol`,
      `${base}_xyz`
    ];

    // Check which ones are actually available in bulk
    const { data } = await supabase
      .from('users')
      .select('username')
      .in('username', candidates);
      
    const taken = new Set((data || []).map(u => u.username));
    
    // Return up to 3 available suggestions
    return candidates.filter(c => !taken.has(c)).slice(0, 3);
  };

  return { isChecking, isAvailable, suggestions };
}
