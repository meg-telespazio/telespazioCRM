'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Textarea, type TextareaProps } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { UserProfile, Contact } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';

interface MentionTextareaProps extends TextareaProps {
  users: UserProfile[];
  contacts: Contact[];
}

export function MentionTextarea({ value, onChange, users, contacts, ...props }: MentionTextareaProps) {
  const { t } = useI18n();
  const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionables = useMemo(() => {
    return [
      ...users.map(u => ({ id: u.uid, name: u.displayName || u.email || '', type: 'user' as const })),
      ...contacts.map(c => ({ id: c.id, name: c.name, type: 'contact' as const }))
    ].filter(m => m.name).filter((m, i, self) => i === self.findIndex(t => t.name === m.name));
  }, [users, contacts]);

  const filteredMentionables = useMemo(() => {
    if (!mentionQuery) return mentionables;
    return mentionables.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [mentionQuery, mentionables]);

  useEffect(() => { setActiveIndex(0); }, [filteredMentionables]);
  
  const handleMentionSelect = (name: string) => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);
    
    if (atMatch && onChange) {
      const startIndex = atMatch.index || 0;
      const newText = `${text.substring(0, startIndex)}@${name} ${text.substring(cursorPosition)}`;
      
      const syntheticEvent = { target: { value: newText } } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = startIndex + name.length + 2;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
    setMentionPopoverOpen(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    props.onKeyDown?.(e);
    if (mentionPopoverOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((p) => (p + 1) % filteredMentionables.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((p) => (p - 1 + filteredMentionables.length) % filteredMentionables.length); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredMentionables.length > 0) {
          e.preventDefault();
          handleMentionSelect(filteredMentionables[activeIndex].name);
        }
      }
      else if (e.key === 'Escape') { e.preventDefault(); setMentionPopoverOpen(false); }
    }
  };
  
  const handleOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e);
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);
    if (atMatch) {
      setMentionPopoverOpen(true);
      setMentionQuery(atMatch[1]);
    } else {
      setMentionPopoverOpen(false);
    }
  };

  return (
    <Popover open={mentionPopoverOpen} onOpenChange={setMentionPopoverOpen}>
      <PopoverTrigger asChild>
        <Textarea {...props} value={value} onChange={handleOnChange} onKeyDown={handleKeyDown} ref={textareaRef} />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div className="max-h-60 overflow-y-auto">
          {filteredMentionables.length > 0 ? (
            filteredMentionables.map((m, index) => (
              <div
                key={`${m.type}-${m.id}`}
                className={`p-2 cursor-pointer text-sm ${index === activeIndex ? 'bg-accent' : 'hover:bg-accent/50'}`}
                onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(m.name); }}
              >
                {m.name}
                <span className="text-xs text-muted-foreground ml-2">{t(m.type === 'user' ? 'Activity.appUser' : 'Activity.clientContact')}</span>
              </div>
            ))
          ) : (
            <p className="p-2 text-sm text-muted-foreground">{t('Activity.noMentionsFound')}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
