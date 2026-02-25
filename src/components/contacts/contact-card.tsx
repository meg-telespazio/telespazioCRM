'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreVertical, Edit, Trash2, Mail, Phone, Building } from 'lucide-react';
import type { Contact, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';

type ContactCardProps = {
    contact: Contact;
    client: Client | undefined;
    onEdit: (contact: Contact) => void;
    onDelete: (contactId: string) => void;
};

export function ContactCard({ contact, client, onEdit, onDelete }: ContactCardProps) {
    const { t } = useI18n();

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    return (
        <Card className="flex flex-col transform transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl -rotate-1 hover:rotate-0">
            <CardHeader className="flex-row items-start justify-between pb-2">
                <Avatar className="h-12 w-12 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-secondary text-secondary-foreground font-bold">
                        {getInitials(contact.name)}
                    </AvatarFallback>
                </Avatar>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(contact)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>{t('Actions.editContact')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(contact.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>{t('Actions.deleteContact')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
                <CardTitle className="text-lg leading-tight truncate">{contact.name}</CardTitle>
                {contact.position && <CardDescription>{t(`ContactPositions.${contact.position}`)}</CardDescription>}
                
                <div className="pt-2 text-sm text-muted-foreground space-y-1">
                   {client && <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 shrink-0" />
                        <span className="truncate">{client.name}</span>
                    </div>}
                    {contact.emails?.[0]?.address && <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0" />
                        <a href={`mailto:${contact.emails[0].address}`} className="truncate hover:underline">{contact.emails[0].address}</a>
                    </div>}
                     {contact.phones?.[0]?.number && <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span className="truncate">{contact.phones[0].number}</span>
                    </div>}
                </div>
            </CardContent>
            <CardFooter className="flex justify-center p-3 mt-auto">
                 <div className="w-6 h-1.5 bg-muted rounded-full" />
            </CardFooter>
        </Card>
    );
}
