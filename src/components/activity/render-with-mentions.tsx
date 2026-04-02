'use client';
import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile, Contact } from '@/lib/types';
import { cn } from '@/lib/utils';

type RenderWithMentionsProps = {
  text: string | undefined;
  users?: UserProfile[];
  contacts?: Contact[];
};

export function RenderWithMentions({ text, users = [], contacts = [] }: RenderWithMentionsProps) {
  const router = useRouter();

  if (!text) {
    return null;
  }

  // Create a combined lookup map for mentionable names
  const mentionMap = useMemo(() => {
    const map = new Map<string, { id: string; type: 'user' | 'contact' }>();
    
    users.forEach(u => {
      if (u.displayName) map.set(u.displayName, { id: u.uid, type: 'user' });
    });
    
    contacts.forEach(c => {
      if (c.name) map.set(c.name, { id: c.id, type: 'contact' });
    });
    
    return map;
  }, [users, contacts]);

  const mentionRegex = /@(\w[\w.-]*(?:\s\w[\w.-]*)*)/g;
  
  // We need to be careful with greedy matching if names have spaces.
  // The MentionTextarea inserts "@Name ".
  const parts = text.split(/(@\w[\w.-]*(?:\s\w[\w.-]*)*)/g);

  const handleMentionClick = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering parent row clicks
    
    const target = mentionMap.get(name);
    if (!target) return;

    if (target.type === 'contact') {
      router.push(`/contacts/${target.id}`);
    } else {
      router.push(`/settings/users/${target.id}`);
    }
  };

  return (
    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const name = part.substring(1);
          const isValidMention = mentionMap.has(name);

          return (
            <span 
              key={index} 
              onClick={(e) => isValidMention && handleMentionClick(e, name)}
              className={cn(
                "font-semibold rounded-sm px-1 transition-colors",
                isValidMention 
                  ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 underline decoration-dotted" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
}
