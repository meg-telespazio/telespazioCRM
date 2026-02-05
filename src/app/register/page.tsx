import { AuthFormCard } from '@/components/auth/auth-form-card';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-destructive p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white tracking-tight">T-Track</h1>
      </div>
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
