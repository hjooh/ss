import { NextRequest, NextResponse } from 'next/server';
import { sampleApartments } from '@/data/apartments';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, currentApartments } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('Generating second half apartments for session:', sessionId);
    console.log('Current apartments count:', currentApartments?.length || 0);

    // Get all available apartments
    const allApartments = [...sampleApartments];
    
    // Filter out apartments that have already been used
    const usedApartmentIds = new Set(currentApartments?.map((apt: any) => apt.id) || []);
    const availableApartments = allApartments.filter(apt => !usedApartmentIds.has(apt.id));
    
    console.log('Available apartments for second half:', availableApartments.length);

    // Generate random selection for the latter half
    const secondHalfCount = Math.min(8, availableApartments.length); // Select up to 8 apartments
    const shuffled = [...availableApartments].sort(() => Math.random() - 0.5);
    const selectedApartments = shuffled.slice(0, secondHalfCount);

    console.log('Selected apartments for second half:', selectedApartments.map(apt => apt.name));

    return NextResponse.json({
      success: true,
      apartments: selectedApartments,
      count: selectedApartments.length,
      message: `Generated ${selectedApartments.length} apartments for the second half of your search`
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating second half apartments:', error);
    return NextResponse.json(
      { error: 'Failed to generate second half apartments' },
      { status: 500 }
    );
  }
}
