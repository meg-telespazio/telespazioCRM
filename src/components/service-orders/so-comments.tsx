
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import type { ServiceOrderComment, UserProfile } from '@/lib/types';
import { addSOComment } from '@/lib/firestore/service-orders';
import { collection, query, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2, History } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface SOCommentsProps {
  soId: string;
}

export function SOComments({ soId }: SOCommentsProps) {
  const { t, locale } = useI18n();
  const firestore = useFirestore();
  const { user } = useUser();
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const commentsQuery = query(
    collection(firestore, 'service_orders', soId, 'comments'),
    orderBy('timestamp', 'desc')
  );

  const { data: comments, loading } = useCollection<ServiceOrderComment>(commentsQuery);

  const handlePost = async () => {
    if (!text.trim() || !user) return;
    setIsPosting(true);
    try {
      await addSOComment(firestore, soId, user as any, text);
      setText('');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="border-b bg-slate-50/50">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          {t('SO.comments')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {comments?.map((comment) => (
          <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-top-1">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px] uppercase font-bold bg-muted text-muted-foreground">
                {comment.userName?.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">{comment.userName}</span>
                <span className="text-[9px] text-muted-foreground">
                  {comment.timestamp ? formatDistanceToNow(comment.timestamp, { addSuffix: true, locale: locale === 'es' ? es : undefined }) : '...'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border shadow-sm text-xs leading-relaxed">
                {comment.statusChange && (
                  <Badge variant="outline" className="mb-2 block w-fit text-[8px] border-primary/20 text-primary uppercase font-bold">
                    Estado: {comment.statusChange}
                  </Badge>
                )}
                {comment.text}
              </div>
            </div>
          </div>
        ))}
        {loading && <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-20" />}
      </CardContent>
      <div className="p-4 border-t bg-slate-50/50 mt-auto">
        <div className="relative">
          <Textarea 
            placeholder="Escribe un comentario..." 
            className="min-h-[80px] bg-white pr-12 text-xs resize-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isPosting}
          />
          <Button 
            size="icon" 
            className="absolute bottom-2 right-2 h-8 w-8"
            onClick={handlePost}
            disabled={!text.trim() || isPosting}
          >
            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
