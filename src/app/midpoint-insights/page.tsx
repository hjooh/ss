'use client';

import { useRouter } from 'next/navigation';
import { MidpointInsights } from '@/components/midpoint-insights';

export default function MidpointInsightsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <MidpointInsights 
        session={{
          id: 'mock-session',
          code: 'MOCK123',
          name: 'Mock Session',
          currentRound: 5,
          settings: { numberOfRounds: 10 },
          championApartment: undefined,
          eliminatedApartments: [],
          matchupLog: [],
          availableApartments: []
        }}
        onContinue={() => router.replace('/')}
        onRefineSearch={(priority, direction) => {
          console.log('Refining search with priority:', priority, 'direction:', direction);
          // TODO: Implement socket event to update ranking
          router.replace('/');
        }}
      />
    </div>
  );
}
