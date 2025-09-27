'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { RoommateList } from './roommate-list';
import { ApartmentCard } from './apartment-card';
import { sampleApartments } from '@/data/apartments';

interface HuntSessionProps {
  onLeaveSession: () => void;
  socketHook: ReturnType<typeof useSocket>;
}

export const HuntSession = ({ onLeaveSession, socketHook }: HuntSessionProps) => {
  const { sessionState, rateApartment, vetoApartment, nextApartment, previousApartment } = socketHook;
  const [showRoommateList, setShowRoommateList] = useState(false);

  const { session, currentUser, apartments } = sessionState;

  console.log('HuntSession: sessionState:', sessionState);
  console.log('HuntSession: session:', session);
  console.log('HuntSession: currentUser:', currentUser);

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

  const currentApartment = apartments[session.currentApartmentIndex];
  const isVetoed = session.vetos.some(v => v.apartmentId === currentApartment?.id);

  const handleRate = (apartmentId: string, stars: number) => {
    rateApartment(apartmentId, stars);
  };

  const handleVeto = (apartmentId: string) => {
    vetoApartment(apartmentId);
  };

  const handleNext = () => {
    if (session.currentApartmentIndex < apartments.length - 1) {
      nextApartment();
    }
  };

  const handlePrevious = () => {
    if (session.currentApartmentIndex > 0) {
      previousApartment();
    }
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
                <button
                  onClick={copySessionCode}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                >
                  {session.code}
                </button>
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
            {currentApartment ? (
              <div className="space-y-6">
                {/* Apartment Card */}
                <ApartmentCard
                  apartment={currentApartment}
                  ratings={session.ratings}
                  vetos={session.vetos}
                  roommates={session.roommates}
                  currentUser={currentUser}
                  onRate={handleRate}
                  onVeto={handleVeto}
                  isVetoed={isVetoed}
                />

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={handlePrevious}
                    disabled={session.currentApartmentIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>←</span>
                    <span>Previous</span>
                  </button>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      {session.currentApartmentIndex + 1} of {apartments.length}
                    </p>
                    <div className="flex space-x-1 mt-1">
                      {apartments.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full ${
                            index === session.currentApartmentIndex
                              ? 'bg-blue-600'
                              : index < session.currentApartmentIndex
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={session.currentApartmentIndex === apartments.length - 1}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No More Apartments</h2>
                <p className="text-gray-600">You've reviewed all available listings!</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {showRoommateList && (
              <div className="sticky top-8">
                <RoommateList
                  roommates={session.roommates}
                  currentUser={currentUser}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
