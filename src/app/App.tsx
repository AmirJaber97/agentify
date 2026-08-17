import { useEffect, useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { createQueryClient } from './queryClient';
import { router } from './router';
import { checkSession, useSession } from '@/auth/session';
import { LoginPage } from '@/auth/LoginPage';
import { startStream, stopStream } from '@/api/sse';
import { Spinner } from '@/components/ui';

export function App() {
  const queryClient = useMemo(createQueryClient, []);
  const session = useSession();

  useEffect(() => {
    void checkSession();
  }, []);

  useEffect(() => {
    if (session.status === 'authenticated') {
      startStream(queryClient);
      return () => stopStream();
    }
    return undefined;
  }, [session.status, queryClient]);

  if (session.status === 'checking') {
    return (
      <div className="login">
        <Spinner large label="Connecting…" />
      </div>
    );
  }

  if (session.status === 'unauthenticated') {
    return <LoginPage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
