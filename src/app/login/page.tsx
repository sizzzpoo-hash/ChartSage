'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bot } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleAuthAction = async (action: 'signIn' | 'signUp') => {
    setIsLoading(true);
    try {
      const authFn = action === 'signIn' ? signIn : signUp;
      await authFn(email, password);
      router.push('/');
      toast({
        title: `Successfully ${action === 'signIn' ? 'signed in' : 'signed up'}!`,
        description: 'Welcome to ChartSage AI.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message || 'An unknown error occurred.',
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <Bot className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-2xl">Welcome to ChartSage AI</CardTitle>
          <CardDescription>
            Enter your email below to login or create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
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
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handleAuthAction('signIn')} disabled={isLoading || !email || !password} className="w-full">
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Button onClick={() => handleAuthAction('signUp')} disabled={isLoading || !email || !password} variant="outline" className="w-full">
                {isLoading ? 'Signing Up...' : 'Sign Up'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
