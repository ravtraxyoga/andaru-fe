import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { ApiError, getParent } from './api';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => count < 2 && !(err instanceof ApiError && err.status > 0 && err.status < 500),
    },
  },
});

// Ganti akun (login lain atau admin masuk sebagai Bunda): buang cache data akun sebelumnya.
let lastParent = getParent()?.id ?? null;
window.addEventListener('auth-changed', () => {
  const id = getParent()?.id ?? null;
  if (id !== lastParent) queryClient.clear();
  lastParent = id;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
