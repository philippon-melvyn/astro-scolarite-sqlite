// src/middleware.ts
import { getSession } from 'auth-astro/server';
//possibilité de passé des arguments notamment locals pour échange entre middleware et appli
export async function onRequest(context: any, next: any) {
  // Ne pas vérifier la session sur les routes d'authentification
  if (context.url.pathname.startsWith('/api/auth/') || context.url.pathname === '/login') {
    return next();
  }

  try {
    const session = await getSession(context.request);

    if (!session) {
      return context.redirect('/login');
    }

    return next();
  } catch (error) {
    console.error('Erreur de session:', error);
    return context.redirect('/login');
  }
}