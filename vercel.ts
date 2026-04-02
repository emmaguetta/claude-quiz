import type { VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [
    {
      // Regénère ~10 nouvelles questions chaque lundi à 9h UTC
      path: '/api/questions/generate',
      schedule: '0 9 * * 1',
    },
  ],
}
