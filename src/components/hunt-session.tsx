'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { RoommateList } from './roommate-list';
import { ApartmentComparison } from './apartment-comparison';
import { TopContenders } from './top-contenders';
import { SessionSettings } from './session-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Copy, Check, Settings } from 'lucide-react';

interface HuntSessionProps {
  onLeaveSession: () => void;
  socketHook: ReturnType<typeof useSocket>;
}

export const HuntSession = ({ onLeaveSession, socketHook }: HuntSessionProps) => {
  const { sessionState, voteApartment, forceEndRound, hostTiebreak, startSession, updateSettings } = socketHook;
  const [showRoommateList, setShowRoommateList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showTopContenders, setShowTopContenders] = useState(false);

  const { session, currentUser } = sessionState;

  console.log('HuntSession: sessionState:', sessionState);
  console.log('HuntSession: session:', session);
  console.log('HuntSession: currentUser:', currentUser);
  console.log('HuntSession: isHost?', currentUser?.id === session?.hostId);
  console.log('HuntSession: session.hostId:', session?.hostId);
  console.log('HuntSession: currentUser.id:', currentUser?.id);
  console.log('HuntSession: session.settings:', session?.settings);

  if (!session || !currentUser) {
    console.log('HuntSession: Showing loading state');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
          <p className="text-sm text-gray-500 mt-2">
            Session: {session ? 'exists' : 'null'}, User: {currentUser ? 'exists' : 'null'}
          </p>
        </div>
      </div>
    );
  }

  const handleVote = (apartmentId: string) => {
    voteApartment(apartmentId);
  };

  const handleForceEndRound = () => {
    forceEndRound();
  };

  const handleHostTiebreak = (winnerId: string) => {
    hostTiebreak(winnerId);
  };

  const copySessionCode = () => {
    navigator.clipboard.writeText(session.code);
    // You could add a toast notification here
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">PadMatch</h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Session:</span>
                <div className="relative">
                  <button
                    onClick={copySessionCode}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    {session.code}
                  </button>
                  {showTooltip && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10">
                      Click to copy session code
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowRoommateList(!showRoommateList)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <div className="flex -space-x-2">
                  {session.roommates.slice(0, 3).map((roommate) => (
                    <img
                      key={roommate.id}
                      src={roommate.avatar}
                      alt={roommate.nickname}
                      className="w-8 h-8 rounded-full border-2 border-white"
                    />
                  ))}
                  {session.roommates.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      +{session.roommates.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm">{session.roommates.length} roommates</span>
              </button>

              <button
                onClick={() => setShowTopContenders(!showTopContenders)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Top Contenders
              </button>
              
              <button
                onClick={onLeaveSession}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Leave Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {session.currentMatchup ? (
              <div className="space-y-6">
                {/* Apartment Comparison */}
                <ApartmentComparison
                  matchup={session.currentMatchup}
                  roommates={session.roommates}
                  currentUser={currentUser}
                  onVote={handleVote}
                  onForceEndRound={handleForceEndRound}
                  onHostTiebreak={handleHostTiebreak}
                  isHost={currentUser?.id === session.hostId}
                />
              </div>
            ) : session.championApartment ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tournament Complete!</h2>
                <p className="text-gray-600 mb-6">
                  The winner is: <strong>{session.championApartment.name}</strong>
                </p>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <img 
                    src={session.championApartment.photos[0]} 
                    alt={session.championApartment.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-lg font-semibold">{session.championApartment.name}</h3>
                  <p className="text-gray-600">{session.championApartment.address}</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    ${session.championApartment.rent}/month
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {currentUser?.id === session.hostId ? 'Ready to Start?' : 'Waiting for Host'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {currentUser?.id === session.hostId 
                    ? 'Start the apartment comparison tournament when everyone is ready!'
                    : 'The host will start the comparison tournament soon.'
                  }
                </p>
                
                {currentUser?.id === session.hostId && (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <button
                        onClick={startSession}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Start Tournament
                      </button>
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Session Settings
                      </button>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>{session.availableApartments.length} apartments ready to compare</p>
                      <p>{session.roommates.length} roommates joined</p>
                    </div>
                  </div>
                )}
                
                {currentUser?.id !== session.hostId && (
                  <div className="text-sm text-gray-500">
                    <p>Session created by {session.roommates.find(r => r.isOnline)?.nickname}</p>
                    <p>Waiting for tournament to begin...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {showRoommateList && (
                <RoommateList
                  roommates={session.roommates}
                  currentUser={currentUser}
                />
              )}
              
              {showTopContenders && (
                <TopContenders
                  session={session}
                />
              )}
              
              {showSettings && (
                <SessionSettings
                  settings={session.settings || {
                    requireUnanimousVoting: false,
                    allowVetoOverride: true,
                    minimumRatingToPass: 3,
                    allowMembersToControlNavigation: true,
                    autoAdvanceOnConsensus: false,
                    sessionTimeout: 120,
                    maxRent: null,
                    minBedrooms: null,
                    maxCommute: null,
                    showIndividualRatings: true,
                    allowGuestJoining: true,
                    notifyOnNewRatings: true,
                    notifyOnVetos: true
                  }}
                  onUpdateSettings={updateSettings}
                  isHost={currentUser?.id === session.hostId}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
