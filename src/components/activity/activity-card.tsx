'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Activity, ActivityFollowUp, ActivityType, UserProfile } from '@/lib/types';
import { addFollowUp } from '@/lib/firestore/activities';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useI18n } from '@/firebase/client-provider';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Phone,
  Calendar,
  Mail,
  MessageSquare,
  Send,
  Star,
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { collection, query, orderBy } from 'firebase/firestore';

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
  message: MessageSquare,
};

const followUpSchema = z.object({
  content: z.string().min(1, 'Cannot be empty'),
});

type ActivityCardProps = {
  activity: Activity;
  users: Map<string, UserProfile>;
};

export function ActivityCard({ activity, users }: ActivityCardProps) {
  const { t, locale } = useI18n();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const form = useForm<z.infer<typeof followUpSchema>>({
    resolver: zodResolver(followUpSchema),
    defaultValues: { content: '' },
  });

  const followUpsQuery = useMemo(() => {
    return query(
        collection(firestore, 'activities', activity.id, 'followUps'),
        orderBy('createdAt', 'asc')
    );
  }, [firestore, activity.id]);

  const { data: followUps, loading: followUpsLoading } = useCollection<ActivityFollowUp>(followUpsQuery);

  const author = users.get(activity.createdBy);
  const Icon = activityIcons[activity.type] || MessageSquare;

  const onSubmit = (values: z.infer<typeof followUpSchema>) => {
    if (!currentUser) return;
    addFollowUp(firestore, activity.id, {
      createdBy: currentUser.uid,
      content: values.content,
    });
    form.reset();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <Icon className="h-5 w-5 text-secondary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              {t(`Activity.types.${activity.type}`)}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(activity.createdAt, 'PPp', { locale: locale === 'es' ? es : undefined })}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('Activity.loggedBy')} {author?.displayName || 'System'}
          </p>
        </div>
        {activity.isPriority && <Star className="h-5 w-5 text-yellow-500 fill-current" />}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{activity.description}</p>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4">
        {followUpsLoading ? <Skeleton className="h-10 w-full" /> : 
          followUps?.map((followUp) => {
            const followUpAuthor = users.get(followUp.createdBy);
            return (
              <div key={followUp.id} className="flex items-start gap-4 w-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={followUpAuthor?.photoURL} />
                  <AvatarFallback>
                    {followUpAuthor?.displayName?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold">{followUpAuthor?.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(followUp.createdAt, { addSuffix: true, locale: locale === 'es' ? es : undefined })}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{followUp.content}</p>
                </div>
              </div>
            );
        })}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex w-full items-start gap-4"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser?.photoURL} />
              <AvatarFallback>{currentUser?.displayName?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <div className="relative flex-1">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={t('Activity.addFollowUp')}
                        {...field}
                        className="min-h-0 resize-none pr-12"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                            }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" variant="ghost">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardFooter>
    </Card>
  );
}
