
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { getUserByEmail, consumeAutologinToken, getUserById } from '@/lib/data';
import { User } from '@/lib/types';
import { Loader, Smartphone } from 'lucide-react';

function LoginFormComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const autologinProcessed = useRef(false);

  useEffect(() => {
    const handleAutologin = async () => {
      const token = searchParams.get('autologin_token');
      if (token && !autologinProcessed.current) {
        autologinProcessed.current = true;
        setIsLoading(true);
        try {
          const tokenData = await consumeAutologinToken(token);
          if (tokenData) {
            const user = await getUserById(tokenData.userId);
            if (user) {
              await login(user);
              toast({
                title: 'Accesso effettuato',
                description: `Accesso automatico in corso come ${user.name}...`,
              });
              if (user.role === 'Client') {
                  router.replace('/dashboard/requests');
              } else {
                  router.replace('/dashboard');
              }
            }
          } else {
            toast({
              variant: 'destructive',
              title: 'Accesso fallito',
              description: 'Il link di accesso non è più valido o è scaduto.',
            });
            router.replace('/login');
          }
        } catch (error) {
          console.error("Autologin failed:", error);
          toast({
            variant: 'destructive',
            title: 'Accesso fallito',
            description: 'Si è verificato un errore durante l\'accesso automatico.',
          });
          router.replace('/login');
        } finally {
          setIsLoading(false);
        }
      }
    };
    handleAutologin();
  }, [searchParams, login, router, toast]);


  const handleLogin = async () => {
    setIsLoading(true);
    try {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        if (!cleanEmail || !cleanPassword) {
            throw new Error("Inserisci sia l'email che la password.");
        }

        const userToLogin = await getUserByEmail(cleanEmail);

        if (userToLogin && userToLogin.password?.trim() === cleanPassword) {
            await login(userToLogin);
            toast({
                title: 'Accesso effettuato',
                description: `Bentornato, ${userToLogin.name}!`,
            });
            const isDistributorOp = userToLogin.role === 'DistributorAdmin' || userToLogin.role === 'DistributorUser';
            const isDistributor = userToLogin.role === 'Distributor';
            const target = isDistributor
              ? '/dashboard/distributor-dashboard'
              : isDistributorOp
              ? '/dashboard/operator-dashboard'
              : '/dashboard';
            router.push(target);
        } else {
            throw new Error("Credenziali non valide.");
        }
    } catch (error: any) {
       let description = 'Credenziali non valide. Riprova.';
       if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
           description = 'Email o password non corretti.';
       } else if (error.message) {
           description = error.message;
       }
       toast({
        variant: 'destructive',
        title: 'Accesso fallito',
        description: description,
      });
    }
    setIsLoading(false);
  };
  

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
          {isLoading && (
              <div className="flex flex-col items-center justify-center space-y-2">
                <Loader className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">Accesso in corso...</p>
              </div>
          )}
          {!isLoading && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
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
                   disabled={isLoading}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-4">
           {!isLoading && (
            <>
              <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                 {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Accedi
              </Button>
               <div className="mt-4 text-center text-sm">
                Non hai un account?{' '}
                <Link href="/register" className="underline">
                  Registra una nuovo installatore
                </Link>
              </div>
              <div className="w-full pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full gap-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
                >
                  <a href="/mannatic.apk" download="mannatic.apk">
                    <Smartphone className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Scarica l'App Android (.APK)</span>
                  </a>
                </Button>
              </div>
            </>
           )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader className="h-8 w-8 animate-spin" /></div>}>
      <LoginFormComponent />
    </Suspense>
  )
}
