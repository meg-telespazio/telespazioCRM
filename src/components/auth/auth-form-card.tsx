import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type AuthFormCardProps = {
  title: string;
  description: string;
  footerText: string;
  footerLink: string;
  footerLinkText: string;
  children: React.ReactNode;
};

export function AuthFormCard({
  title,
  description,
  footerText,
  footerLink,
  footerLinkText,
  children,
}: AuthFormCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
      <CardFooter>
        <div className="mt-4 text-center text-sm">
          {footerText}{' '}
          <Link href={footerLink} className="underline">
            {footerLinkText}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
