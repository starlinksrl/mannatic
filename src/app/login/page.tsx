
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { getUserByEmail } from '@/lib/data';
import { User } from '@/lib/types';
import { CREATOR_USER } from '@/lib/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    try {
        let userToLogin: User | null;
        
        if (email.toLowerCase() === CREATOR_USER.email.toLowerCase()) {
            if (password === CREATOR_USER.password) {
                 userToLogin = CREATOR_USER;
            } else {
                throw new Error("Invalid credentials");
            }
        } else {
            // For regular users, we check against firestore
            userToLogin = await getUserByEmail(email);
            if (!userToLogin || userToLogin.password !== password) {
                 throw new Error("Invalid credentials");
            }
        }
        
        if (userToLogin) {
            login(userToLogin); // This now only sets the state
            router.push('/dashboard');
            toast({
                title: 'Accesso effettuato',
                description: `Bentornato, ${userToLogin.name}!`,
            });
        } else {
            throw new Error("Invalid credentials");
        }

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Accesso fallito',
        description: 'Credenziali non valide. Riprova.',
      });
    }
  };
  
  const handleCreatorLogin = () => {
    setEmail(CREATOR_USER.email);
  }


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
          <CardTitle className="text-2xl">Accedi a MannaTic</CardTitle>
          <CardDescription>Inserisci le tue credenziali per continuare</CardDescription>
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
          <div className="grid gap-2">
             <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="ml-auto inline-block text-sm underline"
              >
                Password dimenticata?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button className="w-full" onClick={handleLogin}>
            Accedi
          </Button>
          <div className="relative w-full">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-xs text-muted-foreground">
                DEV
            </span>
          </div>
           <Button variant="outline" className="w-full" onClick={handleCreatorLogin}>
            Login as Creator (Dev)
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
