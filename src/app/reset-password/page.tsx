'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';
import { Loader } from 'lucide-react';

function ResetPasswordFormComponent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const handleResetPassword = () => {
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Le password non coincidono.',
      });
      return;
    }
    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'La password deve contenere almeno 8 caratteri.',
      });
      return;
    }

    // In a real app, you would call an API to reset the password with the token
    console.log('Resetting password with token:', token);
    toast({
      title: 'Password aggiornata',
      description: 'La tua password è stata resettata con successo. Ora puoi effettuare il login.',
    });
    router.push('/login');
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>
        <CardTitle className="text-2xl">Resetta Password</CardTitle>
        <CardDescription>
          Inserisci la tua nuova password.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="password">Nuova Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
         <div className="grid gap-2">
          <Label htmlFor="confirm-password">Conferma Nuova Password</Label>
          <Input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button className="w-full" onClick={handleResetPassword}>
          Resetta Password
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Suspense fallback={<Loader className="h-8 w-8 animate-spin" />}>
        <ResetPasswordFormComponent />
      </Suspense>
    </div>
  );
}
