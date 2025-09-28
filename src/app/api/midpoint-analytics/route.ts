import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // For now, return mock analysis data
    // TODO: Replace with actual Supabase Edge Function call
    const mockAnalysis = {
      primaryFinding: {
        title: "Budget vs Convenience Trade-off",
        description: "We found a strong correlation (-0.78) showing your group consistently prefers lower-priced apartments, even if they're farther from campus.",
        correlation: -0.78,
        factors: ["price", "distance"]
      },
      outlier: {
        apartmentName: "The Mill",
        description: "However, you also highly rated The Mill, which at $1200 was more expensive but had a 5-minute commute - much shorter than the average 15+ minutes."
      },
      hypothesis: {
        title: "Hypothesis: Short Commute is the Real Priority",
        description: "The Mill's 5-minute commute was significantly shorter than other options. This suggests your group is willing to break budget for a major convenience like a quick trip to campus."
      },
      visualizationData: {
        scatterData: [
          { name: "The Mill", price: 1200, distance: 5, size: 950, selected: true },
          { name: "Foxridge", price: 850, distance: 15, size: 1100, selected: false },
          { name: "Oak Tree", price: 900, distance: 12, size: 1000, selected: false },
          { name: "Huff Heritage", price: 750, distance: 18, size: 900, selected: false },
          { name: "Collegiate Court", price: 1100, distance: 8, size: 1050, selected: false },
        ],
        trendData: [
          { round: 1, avgPrice: 1000, avgDistance: 12 },
          { round: 2, avgPrice: 950, avgDistance: 13 },
          { round: 3, avgPrice: 900, avgDistance: 14 },
          { round: 4, avgPrice: 875, avgDistance: 15 },
          { round: 5, avgPrice: 850, avgDistance: 16 },
        ],
        preferenceData: [
          { factor: "Price", importance: 0.8, color: "#3B82F6" },
          { factor: "Distance", importance: 0.6, color: "#10B981" },
          { factor: "Size", importance: 0.4, color: "#F59E0B" },
          { factor: "Amenities", importance: 0.3, color: "#EF4444" },
        ]
      }
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json(mockAnalysis);

  } catch (error) {
    console.error('Error in midpoint analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
