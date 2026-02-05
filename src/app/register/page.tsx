import { AuthFormCard } from '@/components/auth/auth-form-card';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-destructive">
      <AuthFormCard
        title="Register"
        description="Create a new account."
        footerText="Already have an account?"
        footerLink="/login"
        footerLinkText="Login"
      >
        <RegisterForm />
      </AuthFormCard>
    </div>
  );
}
