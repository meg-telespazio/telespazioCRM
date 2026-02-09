'use client';
import React from 'react';

type RenderWithMentionsProps = {
  text: string | undefined;
};

export function RenderWithMentions({ text }: RenderWithMentionsProps) {
  if (!text) {
    return null;
  }

  const mentionRegex = /@(\w[\w.-]*\w)/g;
  const parts = text.split(mentionRegex);

  return (
    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <span key={index} className="font-semibold bg-primary/10 text-primary rounded-sm px-1">
              @{part}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
}
