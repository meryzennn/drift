import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';

export function useMentionAutocomplete(
  content: string, 
  cursorPosition: number | null, 
  setContent: (content: string) => void,
  currentUsername: string | null = null
) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [matchStart, setMatchStart] = useState(-1);
  const isSelectingRef = useRef(false);

  useEffect(() => {
    if (isSelectingRef.current) return;
    
    if (cursorPosition === null) {
      setShowDropdown(false);
      return;
    }

    const textBeforeCursor = content.slice(0, cursorPosition);
    // Regex matches an optional space (or start of string) followed by @ and alphanumeric/underscore chars at the end
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);

    if (match) {
      const query = match[1];
      
      // Calculate exact index of the '@'
      const atIndex = textBeforeCursor.lastIndexOf('@');
      setMatchStart(atIndex);
      
      fetchSuggestions(query);
    } else {
      setShowDropdown(false);
      setSuggestions([]);
    }
  }, [content, cursorPosition]);

  const fetchSuggestions = async (query: string) => {
    if (query.length > 20) {
      setShowDropdown(false);
      return;
    }

    try {
      let req = supabase.from('users').select('username, display_name, avatar_url');
      if (query) {
        req = req.ilike('username', `${query}%`);
      }
      if (currentUsername) {
        req = req.neq('username', currentUsername);
      }
      const { data, error } = await req.limit(5);

      if (error) throw error;

      if (data && data.length > 0) {
        setSuggestions(data);
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
        setSuggestions([]);
      }
    } catch (err) {
      console.error(err);
      setShowDropdown(false);
    }
  };

  const handleSelect = (username: string, textareaRef: React.RefObject<HTMLTextAreaElement | null>) => {
    if (matchStart === -1) return;
    
    isSelectingRef.current = true;
    
    const beforeMention = content.slice(0, matchStart);
    const afterMention = content.slice(cursorPosition || content.length);
    
    const newContent = `${beforeMention}@${username} ${afterMention}`;
    setContent(newContent);
    setShowDropdown(false);
    setSuggestions([]);
    
    // Attempt to set cursor position after the newly inserted username + space
    if (textareaRef.current) {
      const newCursorPos = matchStart + username.length + 2; // +1 for @, +1 for space
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
        isSelectingRef.current = false;
      }, 50);
    } else {
      isSelectingRef.current = false;
    }
  };

  return {
    suggestions,
    showDropdown,
    handleSelect
  };
}
