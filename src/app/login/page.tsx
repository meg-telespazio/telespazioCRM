import { AuthFormCard } from '@/components/auth/auth-form-card';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-destructive">
      <AuthFormCard
        title="Login"
        description="Enter your credentials to access your account."
        footerText="Don't have an account?"
        footerLink="/register"
        footerLinkText="Register"
      >
        <LoginForm />
      </AuthFormCard>
    </div>
  );
}
