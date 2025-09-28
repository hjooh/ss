'use client';

import { useState, useRef, useEffect } from 'react';
import { Apartment, Vote, Roommate, Matchup } from '@/types';
import { generateRoommateAvatar } from '@/lib/avatar-generator';

interface ApartmentComparisonProps {
  matchup: Matchup;
  roommates: Roommate[];
  currentUser: Roommate | null;
  onVote: (apartmentId: string) => void;
  onForceEndRound?: () => void;
  onHostTiebreak?: (winnerId: string) => void;
  isHost?: boolean;
  roundNumber?: number;
  isAnonymousMode?: boolean;
}

export const ApartmentComparison = ({
  matchup,
  roommates,
  currentUser,
  onVote,
  onForceEndRound,
  onHostTiebreak,
  isHost = false,
  roundNumber = 1,
  isAnonymousMode = false
}: ApartmentComparisonProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState({ left: 0, right: 0 });
  const [animatedVotes, setAnimatedVotes] = useState(new Set<string>());

  // Track which votes have been animated to prevent re-animation on countdown updates
  useEffect(() => {
    if (!matchup) return;
    
    const { votes } = matchup;
    const newVotes = new Set<string>();
    votes.forEach(vote => {
      const voteKey = `${vote.roommateId}-${vote.apartmentId}-${new Date(vote.timestamp).getTime()}`;
      newVotes.add(voteKey);
    });
    
    // Only animate votes that haven't been animated yet
    const unAnimatedVotes = new Set([...newVotes].filter(voteKey => !animatedVotes.has(voteKey)));
    
    if (unAnimatedVotes.size > 0) {
      // Mark these votes as animated after animation completes
      setTimeout(() => {
        setAnimatedVotes(prev => new Set([...prev, ...unAnimatedVotes]));
      }, 600);
    }
  }, [matchup, animatedVotes]);

  if (!matchup) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tournament Complete!</h2>
        <p className="text-gray-600">All apartments have been compared</p>
      </div>
    );
  }

  const { leftApartment, rightApartment, votes, status, countdownSeconds } = matchup;
  const isCountingDown = status === 'counting-down';
  
  // Get votes for each apartment
  const leftVotes = votes.filter(v => v.apartmentId === leftApartment.id);
  const rightVotes = votes.filter(v => v.apartmentId === rightApartment.id);
  
  // Check if current user has voted
  const userVote = votes.find(v => v.roommateId === currentUser?.id);
  const hasUserVoted = !!userVote;
  
  
  // Get roommate avatars for each side
  const leftVoters = leftVotes.map(v => roommates.find(r => r.id === v.roommateId)).filter(Boolean) as Roommate[];
  const rightVoters = rightVotes.map(v => roommates.find(r => r.id === v.roommateId)).filter(Boolean) as Roommate[];
  
  // Count online users
  const onlineUsers = roommates.filter(r => r.isOnline);
  const allVoted = votes.length === onlineUsers.length;

  // Determine non-voters for floating avatars overlay (one avatar per person)
  const voterIds = new Set(votes.map(v => v.roommateId));
  const nonVoters = onlineUsers.filter(u => !voterIds.has(u.id));
  
  const handleVote = (apartmentId: string) => {
    console.log('ApartmentComparison: handleVote called with apartmentId:', apartmentId);
    console.log('ApartmentComparison: hasUserVoted:', hasUserVoted);
    console.log('ApartmentComparison: userVote:', userVote);
    console.log('ApartmentComparison: userVote?.apartmentId:', userVote?.apartmentId);
    
    if (hasUserVoted && userVote?.apartmentId === apartmentId) {
      // User is clicking the same apartment they already voted for - remove vote
      console.log('ApartmentComparison: Removing vote for same apartment');
      onVote(apartmentId);
    } else {
      // User is voting for a different apartment or voting for the first time
      console.log('ApartmentComparison: Adding/changing vote');
      onVote(apartmentId);
    }
  };

  const nextImage = (side: 'left' | 'right') => {
    const apartment = side === 'left' ? leftApartment : rightApartment;
    setCurrentImageIndex(prev => ({
      ...prev,
      [side]: (prev[side] + 1) % apartment.photos.length
    }));
  };

  const prevImage = (side: 'left' | 'right') => {
    const apartment = side === 'left' ? leftApartment : rightApartment;
    setCurrentImageIndex(prev => ({
      ...prev,
      [side]: (prev[side] - 1 + apartment.photos.length) % apartment.photos.length
    }));
  };

  // Generate consistent positions and rotation for profile pictures based on voter ID
  const getVoterPosition = (voterId: string) => {
    // Create a simple hash from the voter ID for consistent positioning
    let hash = 0;
    for (let i = 0; i < voterId.length; i++) {
      const char = voterId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use hash to generate consistent positions
    const top = (Math.abs(hash) % 60) + 10; // 10% to 70% from top
    const left = ((Math.abs(hash >> 8)) % 70) + 15; // 15% to 85% from left
    
    // Use different parts of the hash for more random-looking rotation
    const rotationHash = Math.abs(hash >> 16) ^ Math.abs(hash >> 24) ^ Math.abs(hash >> 8);
    const rotation = (rotationHash % 120) - 60; // -60° to +60° rotation for more variety
    
    return { top, left, rotation };
  };

  // Seeded pseudo-random generator (stable per user id)
  const seededRandom = (seedStr: string, salt: string) => {
    let seed = 0;
    const mixed = `${seedStr}:${salt}`;
    for (let i = 0; i < mixed.length; i++) {
      seed = (seed * 31 + mixed.charCodeAt(i)) >>> 0;
    }
    // Xorshift32
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    // Normalize to [0,1)
    return (seed >>> 0) / 0xffffffff;
  };

  // Position floating non-voter avatars near, but never inside, the cards
  // Strategy:
  // - Keep horizontal clusters clearly outside the card regions
  //   (left cluster: ~6%-18%, right cluster: ~82%-94%)
  // - Keep vertical bands above or below the cards, avoiding the card band
  //   (above: ~10%-22%, below: ~78%-90%)
  const getFloatingPositionForUser = (userId: string, index: number) => {
    const sideRand = seededRandom(userId, 'side');
    const verticalRand = seededRandom(userId, 'vertical');
    const isLeftCluster = sideRand < 0.5;
    const placeAbove = verticalRand < 0.5;

    // Bring closer but still outside cards
    // Horizontal: left band ~10–18%, right band ~82–90%
    const baseLeftMin = isLeftCluster ? 10 : 82;
    const baseLeftMax = isLeftCluster ? 18 : 90;
    // Vertical: just above (~16–26%) or just below (~74–84%) the card band
    const baseTopMin = placeAbove ? 16 : 74;
    const baseTopMax = placeAbove ? 26 : 84;

    const jitterLeft = (seededRandom(userId, `left-${index}`) - 0.5) * 3; // ±1.5%
    const jitterTop = (seededRandom(userId, `top-${index}`) - 0.5) * 3;  // ±1.5%
    const left = Math.min(baseLeftMax, Math.max(baseLeftMin, baseLeftMin + (baseLeftMax - baseLeftMin) * seededRandom(userId, 'lspan') + jitterLeft));
    const top = Math.min(baseTopMax, Math.max(baseTopMin, baseTopMin + (baseTopMax - baseTopMin) * seededRandom(userId, 'tspan') + jitterTop));
    return { top: `${top}%`, left: `${left}%` };
  };

  const ApartmentCard = ({ 
    apartment, 
    votes, 
    voters, 
    side, 
    isSelected 
  }: { 
    apartment: Apartment; 
    votes: Vote[]; 
    voters: Roommate[]; 
    side: 'left' | 'right'; 
    isSelected: boolean;
  }) => {
    return (
      <div 
            className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 border-2 cursor-pointer ${
              isSelected 
                ? 'border-green-500 shadow-green-200' 
                : status === 'tie' 
                  ? 'border-yellow-400 shadow-yellow-200' 
                  : status === 'active'
                    ? 'border-gray-200 hover:border-blue-300 hover:shadow-blue-100'
                    : 'border-gray-200'
            }`}
            onClick={() => (status === 'active' || isCountingDown) && handleVote(apartment.id)}
      >
        {/* Vote indicator overlay */}
        {isSelected && (
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ Your Vote
            </div>
          </div>
        )}
        

        {/* Tie indicator */}
        {status === 'tie' && (
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium">
              ⚖️ Tie
            </div>
          </div>
        )}

        {/* Image Carousel */}
        <div className="relative h-80 bg-gray-200">
          <img
            src={apartment.photos[currentImageIndex[side]]}
            alt={`${apartment.name} - Image ${currentImageIndex[side] + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* Voter Profile Pictures Overlay - appears on card only when they vote */}
          {voters.map((voter) => {
            const position = getVoterPosition(voter.id);
            const isCurrentUser = voter.id === currentUser?.id;
            const displayKey = `${voter.id}-${apartment.id}`;
            
            // Check if this specific vote has been animated
            const specificVote = votes.find(v => v.roommateId === voter.id && v.apartmentId === apartment.id);
            const voteKey = specificVote ? `${specificVote.roommateId}-${specificVote.apartmentId}-${new Date(specificVote.timestamp).getTime()}` : null;
            const hasAnimated = voteKey ? animatedVotes.has(voteKey) : true;
            
            return (
              <div
                key={displayKey}
                className="absolute z-10"
                style={{
                  top: `${position.top}%`,
                  left: `${position.left}%`,
                }}
              >
                <div 
                  className={`relative transition-all duration-300 group ${
                    isCurrentUser 
                      ? 'ring-4 ring-green-500 ring-offset-2 ring-offset-white rounded-full' 
                      : 'shadow-lg'
                  }`}
                  style={{
                    transform: `rotate(${position.rotation}deg)`,
                    animation: !hasAnimated ? 'popInTwist 500ms ease-out' : 'none',
                    '--final-rotation': `${position.rotation}deg`
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = `rotate(${position.rotation}deg) scale(1.1)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = `rotate(${position.rotation}deg) scale(1)`;
                  }}
                >
                  {isAnonymousMode ? (
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 text-lg font-medium">?</span>
                    </div>
                  ) : (
                    <img
                      src={voter.avatar || generateRoommateAvatar(voter.nickname, 60)}
                      alt={voter.nickname}
                      className={`w-12 h-12 rounded-full object-cover ${
                        isCurrentUser ? '' : 'shadow-lg'
                      }`}
                    />
                  )}
                  
                  {/* Tooltip - only show in non-anonymous mode */}
                  {!isAnonymousMode && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
                      {voter.nickname}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                  {isCurrentUser && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in-50 duration-300 ease-out">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          
          {apartment.photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage(side);
                }}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-20"
              >
                ←
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage(side);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-20"
              >
                →
              </button>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 z-20">
                {apartment.photos.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentImageIndex[side] ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{apartment.name}</h2>
              <p className="text-gray-600 text-sm">{apartment.address}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">${apartment.rent}</p>
              <p className="text-sm text-gray-500">per month</p>
            </div>
          </div>

          {/* Property Details */}
          <div className="flex flex-wrap gap-2 mb-4 text-sm">
            <span className="text-gray-600">{apartment.bedrooms} bed</span>
            <span className="text-gray-600">{apartment.bathrooms} bath</span>
            <span className="text-gray-600">{apartment.sqft} sqft</span>
            
            {/* VT-specific info badges */}
            {apartment.distanceToVTCampus && (
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                📍 {apartment.distanceToVTCampus}mi to VT
              </span>
            )}
            {apartment.btAccess && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                🚌 BT Bus
              </span>
            )}
          </div>

          {/* Vote Counter */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Votes</span>
              <span className="text-lg font-bold text-blue-600">
                {votes.length}
              </span>
            </div>
            
            {/* Voter Names */}
            <div className="flex flex-wrap gap-2">
              {voters.map((voter) => (
                <span key={voter.id} className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full">
                  {voter.nickname}
                </span>
              ))}
            </div>
          </div>

          {/* Pros and Cons */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">Pros</h4>
              <ul className="space-y-1">
                {apartment.pros.slice(0, 3).map((pro, index) => (
                  <li key={index} className="text-sm text-gray-700">{pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-700 mb-2">Cons</h4>
              <ul className="space-y-1">
                {apartment.cons.slice(0, 3).map((con, index) => (
                  <li key={index} className="text-sm text-gray-700">{con}</li>
                ))}
              </ul>
            </div>
          </div>

        {/* Click instruction */}
        {status === 'active' && !isCountingDown && (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {isSelected ? 'Click to remove vote' : 'Click anywhere to vote'}
            </p>
          </div>
        )}
        
        {/* Countdown instruction */}
        {isCountingDown && (
          <div className="text-center">
            <p className="text-sm text-orange-600 font-medium">
              {isSelected ? 'Click to remove vote • Round ending in ' + countdownSeconds + 's' : 'Click anywhere to vote • Round ending in ' + countdownSeconds + 's'}
            </p>
          </div>
        )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Global floating avatars for non-voters - clustered near cards */}
      {status === 'active' && nonVoters.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-30">
          {nonVoters.map((user, idx) => {
            const pos = getFloatingPositionForUser(user.id, idx);
            const animDuration = 6 + (idx % 3);
            const animDelay = (idx * 0.2).toFixed(1) + 's';
            return (
              <div
                key={`screen-float-${user.id}`}
                className="absolute"
                style={{
                  top: pos.top,
                  left: pos.left,
                  animation: `float ${animDuration}s ease-in-out ${animDelay} infinite`,
                }}
              >
                {isAnonymousMode ? (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center shadow-xl ring-2 ring-white">
                    <span className="text-gray-600 text-sm font-medium">?</span>
                  </div>
                ) : (
                  <img
                    src={user.avatar || generateRoommateAvatar(user.nickname, 48)}
                    alt={user.nickname}
                    className="w-10 h-10 rounded-full shadow-xl ring-2 ring-white"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Non-blocking countdown overlay */}
      {isCountingDown && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-orange-500 text-white rounded-xl p-6 text-center shadow-2xl animate-pulse">
            <div className="text-4xl font-bold mb-2">
              {countdownSeconds}
            </div>
            <div className="text-sm">
              Round Ending Soon!
            </div>
            <div className="w-full bg-orange-300 rounded-full h-2 mt-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((countdownSeconds || 0) / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Matchup Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Round {roundNumber}</h2>
        <p className="text-gray-600">
          {allVoted ? 'All votes in!' : `${votes.length} of ${onlineUsers.length} votes`}
        </p>
      </div>

      {/* Apartment Comparison */}
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        <div className="flex-1 w-full lg:w-auto">
          <ApartmentCard
            apartment={leftApartment}
            votes={leftVotes}
            voters={leftVoters}
            side="left"
            isSelected={userVote?.apartmentId === leftApartment.id}
          />
        </div>
        
        <div className="flex items-center justify-center py-4 lg:py-0">
          <div className="text-4xl text-gray-400 font-bold">VS</div>
        </div>
        
        <div className="flex-1 w-full lg:w-auto">
          <ApartmentCard
            apartment={rightApartment}
            votes={rightVotes}
            voters={rightVoters}
            side="right"
            isSelected={userVote?.apartmentId === rightApartment.id}
          />
        </div>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="flex justify-center space-x-4">
          {status === 'tie' ? (
            <>
              <button
                onClick={() => onHostTiebreak?.(leftApartment.id)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {leftApartment.name} Wins
              </button>
              <button
                onClick={() => onHostTiebreak?.(rightApartment.id)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {rightApartment.name} Wins
              </button>
            </>
          ) : (
            <button
              onClick={onForceEndRound}
              disabled={allVoted}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {allVoted ? 'All Voted' : 'Force End Round'}
            </button>
          )}
        </div>
      )}
      </div>
    </>
  );
};
