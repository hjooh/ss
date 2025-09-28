'use client';

import { HuntSession, Apartment } from '@/types';

interface TopContendersProps {
  session: HuntSession;
}

export const TopContenders = ({ session }: TopContendersProps) => {
  // Calculate apartment performance based on matchup history
  const getApartmentStats = (apartmentId: string) => {
    let wins = 0;
    let totalMatches = 0;
    
    session.matchupLog.forEach(matchup => {
      if (matchup.leftApartmentId === apartmentId || matchup.rightApartmentId === apartmentId) {
        totalMatches++;
        if (matchup.winnerId === apartmentId) {
          wins++;
        }
      }
    });
    
    return { wins, totalMatches, winRate: totalMatches > 0 ? wins / totalMatches : 0 };
  };

  // Get all apartments that have been in matchups
  const getAllApartments = (): Apartment[] => {
    const apartments = new Map<string, Apartment>();
    
    // Add champion
    if (session.championApartment) {
      apartments.set(session.championApartment.id, session.championApartment);
    }
    
    // Add eliminated apartments
    session.eliminatedApartments.forEach(apt => {
      apartments.set(apt.id, apt);
    });
    
    // Add apartments from matchup history
    session.matchupLog.forEach(matchup => {
      // We'll need to reconstruct apartment data from the matchup log
      // For now, we'll use the champion and eliminated apartments
    });
    
    return Array.from(apartments.values());
  };

  const apartments = getAllApartments();
  
  // Sort apartments by performance
  const sortedApartments = apartments
    .map(apartment => ({
      ...apartment,
      stats: getApartmentStats(apartment.id)
    }))
    .sort((a, b) => {
      // Sort by win rate first, then by total matches
      if (a.stats.winRate !== b.stats.winRate) {
        return b.stats.winRate - a.stats.winRate;
      }
      return b.stats.totalMatches - a.stats.totalMatches;
    });

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Contenders</h3>
      
      {sortedApartments.length === 0 ? (
        <p className="text-gray-500 text-sm">No matchups yet</p>
      ) : (
        <div className="space-y-3">
          {sortedApartments.map((apartment, index) => (
            <div
              key={apartment.id}
              className={`p-3 rounded-lg border ${
                index === 0 && session.championApartment?.id === apartment.id
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 text-sm">{apartment.name}</h4>
                {index === 0 && session.championApartment?.id === apartment.id && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                    🏆 Champion
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span>${apartment.rent}/mo</span>
                <span>{apartment.stats.wins}/{apartment.stats.totalMatches} wins</span>
              </div>
              
              {/* VT-specific info badges */}
              <div className="flex flex-wrap gap-1 mb-2">
                {apartment.distanceToVTCampus && (
                  <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-xs">
                    📍 {apartment.distanceToVTCampus}mi
                  </span>
                )}
                {apartment.btAccess && (
                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                    🚌 BT
                  </span>
                )}
              </div>
              
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Win Rate</span>
                  <span>{(apartment.stats.winRate * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${apartment.stats.winRate * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {session.matchupLog.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <div className="text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Total Matchups:</span>
              <span>{session.matchupLog.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Apartments Compared:</span>
              <span>{apartments.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
