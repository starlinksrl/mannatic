
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';
import { handleRegistration } from '@/app/actions';
import { Loader } from 'lucide-react';
import { useUser } from '@/contexts/user-context';

const formSchema = z.object({
  companyName: z.string().min(2, { message: "Il nome dell'installatore deve contenere almeno 2 caratteri." }),
  name: z.string().min(2, { message: 'Il tuo nome deve contenere almeno 2 caratteri.' }),
  email: z.string().email({ message: 'Inserisci un indirizzo email valido.' }),
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { login } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      name: '',
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const result = await handleRegistration(values);
    setIsLoading(false);

    if (result.success && result.user) {
      toast({
        title: 'Registrazione completata!',
        description: `Benvenuto in MannaTic, ${result.user.name}! Le tue credenziali di accesso sono state inviate alla tua email.`,
      });
      // Automatically log in the user
      await login(result.user);
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Errore di registrazione',
        description: result.error,
      });
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Crea un nuovo Installatore</CardTitle>
          <CardDescription>
            Registra il tuo installatore e inizia a gestire i tuoi interventi. La password verrà generata e inviata alla tua email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Installatore</FormLabel>
                    <FormControl>
                      <Input placeholder="La Mia Installatore SRL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Il Tuo Nome (Admin)</FormLabel>
                    <FormControl>
                      <Input placeholder="Mario Rossi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>La Tua Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Registra e Accedi
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm">
            Hai già un account?{' '}
            <Link href="/login" className="underline">
              Accedi qui
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
