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
}

export const ApartmentComparison = ({
  matchup,
  roommates,
  currentUser,
  onVote,
  onForceEndRound,
  onHostTiebreak,
  isHost = false
}: ApartmentComparisonProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState({ left: 0, right: 0 });
  const [animatedVotes, setAnimatedVotes] = useState(new Set<string>());

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
  
  // Track which votes have been animated to prevent re-animation on countdown updates
  useEffect(() => {
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
  }, [votes]); // Only depend on votes, not animatedVotes
  
  
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
          
          {/* Voter Profile Pictures Overlay - Independent of image changes */}
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
                  className={`relative transition-all duration-300 ${
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
                  <img
                    src={voter.avatar || generateRoommateAvatar(voter.nickname, 60)}
                    alt={voter.nickname}
                    className={`w-12 h-12 rounded-full object-cover ${
                      isCurrentUser ? '' : 'shadow-lg'
                    }`}
                  />
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
          <div className="flex space-x-4 mb-4 text-sm text-gray-600">
            <span>{apartment.bedrooms} bed</span>
            <span>{apartment.bathrooms} bath</span>
            <span>{apartment.sqft} sqft</span>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Round {matchup.id.split('-')[1]}</h2>
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
