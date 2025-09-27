'use client';

import { useState } from 'react';
import { Apartment, Vote, Roommate, Matchup } from '@/types';

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

  if (!matchup) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tournament Complete!</h2>
        <p className="text-gray-600">All apartments have been compared</p>
      </div>
    );
  }

  const { leftApartment, rightApartment, votes, status } = matchup;
  
  // Get votes for each apartment
  const leftVotes = votes.filter(v => v.apartmentId === leftApartment.id);
  const rightVotes = votes.filter(v => v.apartmentId === rightApartment.id);
  
  // Check if current user has voted
  const userVote = votes.find(v => v.roommateId === currentUser?.id);
  const hasUserVoted = !!userVote;
  
  console.log('ApartmentComparison: votes:', votes);
  console.log('ApartmentComparison: currentUser:', currentUser);
  console.log('ApartmentComparison: currentUser.id:', currentUser?.id);
  console.log('ApartmentComparison: userVote:', userVote);
  console.log('ApartmentComparison: leftVotes:', leftVotes);
  console.log('ApartmentComparison: rightVotes:', rightVotes);
  
  // Debug: Check each vote's roommateId
  votes.forEach((vote, index) => {
    console.log(`Vote ${index}:`, vote);
    console.log(`Vote ${index} roommateId:`, vote.roommateId);
    console.log(`Vote ${index} matches currentUser?`, vote.roommateId === currentUser?.id);
  });
  
  // Get roommate avatars for each side
  const leftVoters = leftVotes.map(v => roommates.find(r => r.id === v.roommateId)).filter(Boolean);
  const rightVoters = rightVotes.map(v => roommates.find(r => r.id === v.roommateId)).filter(Boolean);
  
  // Count online users
  const onlineUsers = roommates.filter(r => r.isOnline);
  const allVoted = votes.length === onlineUsers.length;
  
  const handleVote = (apartmentId: string) => {
    if (hasUserVoted && userVote?.apartmentId === apartmentId) {
      // User is trying to vote for the same apartment again - allow changing vote
      onVote(apartmentId);
    } else if (!hasUserVoted) {
      // User hasn't voted yet
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
  }) => (
    <div className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 border-2 ${
      isSelected 
        ? 'border-blue-500 shadow-blue-200' 
        : status === 'tie' 
          ? 'border-yellow-400 shadow-yellow-200' 
          : 'border-gray-200'
    }`}>
      {/* Vote indicator overlay */}
      {isSelected && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            ✓ Your Vote
          </div>
        </div>
      )}

      {/* Tie indicator */}
      {status === 'tie' && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium">
            ⚖️ Tie
          </div>
        </div>
      )}

      {/* Image Carousel */}
      <div className="relative h-64 bg-gray-200">
        <img
          src={apartment.photos[currentImageIndex[side]]}
          alt={`${apartment.name} - Image ${currentImageIndex[side] + 1}`}
          className="w-full h-full object-cover"
        />
        
        {apartment.photos.length > 1 && (
          <>
            <button
              onClick={() => prevImage(side)}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              ←
            </button>
            <button
              onClick={() => nextImage(side)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              →
            </button>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
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
          
          {/* Voter Avatars */}
          <div className="flex flex-wrap gap-2">
            {voters.map((voter) => (
              <div key={voter.id} className="flex items-center space-x-1">
                <img
                  src={voter.avatar}
                  alt={voter.nickname}
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-xs text-gray-600">{voter.nickname}</span>
              </div>
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

        {/* Vote Button */}
        <button
          onClick={() => handleVote(apartment.id)}
          disabled={status !== 'active'}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isSelected
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              : status !== 'active'
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSelected ? 'Change Vote' : status !== 'active' ? 'Voting Closed' : 'Vote for This'}
        </button>
      </div>
    </div>
  );

  return (
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
  );
};
