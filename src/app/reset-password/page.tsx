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
import { getAuth, confirmPasswordReset } from 'firebase/auth';

function ResetPasswordFormComponent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const onResetPassword = async () => {
    if (!oobCode) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Codice di reset non valido o mancante.' });
        return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Le password non coincidono.' });
      return;
    }
    if (password.length < 8) {
      toast({ variant: 'destructive', title: 'Errore', description: 'La password deve contenere almeno 8 caratteri.' });
      return;
    }
    
    setLoading(true);
    try {
        const auth = getAuth();
        await confirmPasswordReset(auth, oobCode, password);
        toast({
          title: 'Password aggiornata',
          description: 'La tua password è stata resettata con successo. Ora puoi effettuare il login.',
        });
        router.push('/login');

    } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Errore',
          description: 'Link di reset non valido o scaduto. Riprova la procedura.',
        });
        console.error("Password reset error:", error);
    } finally {
        setLoading(false);
    }
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
            disabled={loading}
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
            disabled={loading}
          />
        </div>
        <Button className="w-full" onClick={onResetPassword} disabled={!oobCode || loading}>
            {loading ? <Loader className="mr-2 animate-spin" /> : null}
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
