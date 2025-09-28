import { NextRequest, NextResponse } from 'next/server';
import { generateApartmentListForRoom } from '@/lib/gemini-apartment-agent';

export async function POST(request: NextRequest) {
  try {
    const { roomCode } = await request.json();

    if (!roomCode) {
      return NextResponse.json(
        { error: 'Room code is required' },
        { status: 400 }
      );
    }

    console.log(`🏠 API: Generating apartment list for room: ${roomCode}`);

    const result = await generateApartmentListForRoom(roomCode);

    if (result.success) {
      return NextResponse.json({
        success: true,
        apartmentList: result.apartmentList,
        message: `Successfully generated apartment list with ${result.apartmentList?.length} apartments`
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
