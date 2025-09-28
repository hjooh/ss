import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, apartments } = await request.json();

    if (!sessionId || !apartments || !Array.isArray(apartments)) {
      return NextResponse.json(
        { error: 'Session ID and apartments array are required' },
        { status: 400 }
      );
    }

    console.log('Adding apartments to ranking system for session:', sessionId);
    console.log('Apartments to add:', apartments.map(apt => apt.name));

    // In a real implementation, this would emit a socket event to add apartments to the ranking system
    // For now, we'll just return success and let the frontend handle the navigation
    
    return NextResponse.json({
      success: true,
      message: `Added ${apartments.length} apartments to ranking system`,
      apartments: apartments
    }, { status: 200 });

  } catch (error) {
    console.error('Error adding apartments to ranking:', error);
    return NextResponse.json(
      { error: 'Failed to add apartments to ranking system' },
      { status: 500 }
    );
  }
}
