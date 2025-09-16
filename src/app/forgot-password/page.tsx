'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const handleSendResetLink = () => {
    // In a real app, you would call an API to send the reset link
    console.log('Sending password reset link to:', email);
    toast({
      title: 'Link di reset inviato',
      description: `Se un account con l'email ${email} esiste, riceverai un link per resettare la password.`,
    });
    router.push('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Password Dimenticata?</CardTitle>
          <CardDescription>
            Inserisci la tua email e ti invieremo un link per resettare la password.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleSendResetLink}>
            Invia link di reset
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
           <Link href="/login" className="text-sm underline">
              Torna al login
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
