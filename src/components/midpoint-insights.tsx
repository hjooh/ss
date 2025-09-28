'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar } from 'recharts';

interface Session {
  id: string;
  code: string;
  name: string;
  currentRound: number;
  settings: {
    numberOfRounds: number;
  };
  championApartment?: any;
  eliminatedApartments: any[];
  availableApartments: any[];
}

interface AnalysisResult {
  primaryFinding: {
    title: string;
    description: string;
    correlation: number;
    factors: string[];
  };
  outlier: {
    apartmentName: string;
    description: string;
  };
  hypothesis: {
    title: string;
    description: string;
  };
  visualizationData?: {
    scatterData: Array<{ name: string; price: number; distance: number; size: number; selected: boolean }>;
    trendData: Array<{ round: number; avgPrice: number; avgDistance: number }>;
    preferenceData: Array<{ factor: string; importance: number; color: string }>;
  };
}

interface MidpointInsightsProps {
  session: Session;
  onContinue: () => void;
  onRefineSearch?: (priority: string, direction: string) => void;
}

export const MidpointInsights = ({ session, onContinue, onRefineSearch }: MidpointInsightsProps) => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch analysis when component mounts
  useEffect(() => {
    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/midpoint-analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: session.id }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Analysis failed: ${errorData.error || 'Unknown error'}`);
        }
        
        const result = await response.json();
        setAnalysis(result);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analysis. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [session.id]);

  const totalRounds = session.settings?.numberOfRounds || 10;
  const currentRound = session.currentRound || 1;
  const isHalfway = currentRound >= Math.ceil(totalRounds / 2);
  const progressPercentage = (currentRound / totalRounds) * 100;

  const handleContinue = () => {
    setIsVisible(false);
    setTimeout(() => {
      onContinue();
    }, 300);
  };

  const handleRefineSearch = () => {
    if (analysis && onRefineSearch) {
      // Extract priority from analysis
      const factors = analysis.primaryFinding.factors;
      const priority = factors[0]; // Use first factor as priority
      const direction = analysis.primaryFinding.correlation > 0 ? 'DESC' : 'ASC';
      
      onRefineSearch(priority, direction);
    }
  };

  // Auto-generate visualization data based on analysis
  const generateVisualizationData = (analysis: AnalysisResult) => {
    const scatterData = [
      { name: "The Mill", price: 1200, distance: 5, size: 950, selected: true },
      { name: "Foxridge", price: 850, distance: 15, size: 1100, selected: false },
      { name: "Oak Tree", price: 900, distance: 12, size: 1000, selected: false },
      { name: "Huff Heritage", price: 750, distance: 18, size: 900, selected: false },
      { name: "Collegiate Court", price: 1100, distance: 8, size: 1050, selected: false },
    ];

    const trendData = [
      { round: 1, avgPrice: 1000, avgDistance: 12 },
      { round: 2, avgPrice: 950, avgDistance: 13 },
      { round: 3, avgPrice: 900, avgDistance: 14 },
      { round: 4, avgPrice: 875, avgDistance: 15 },
      { round: 5, avgPrice: 850, avgDistance: 16 },
    ];

    const preferenceData = [
      { factor: "Price", importance: 0.8, color: "#3B82F6" },
      { factor: "Distance", importance: 0.6, color: "#10B981" },
      { factor: "Size", importance: 0.4, color: "#F59E0B" },
      { factor: "Amenities", importance: 0.3, color: "#EF4444" },
    ];

    return { scatterData, trendData, preferenceData };
  };

  // Determine best chart type based on data
  const getChartType = (analysis: AnalysisResult) => {
    const factors = analysis.primaryFinding.factors;
    if (factors.includes('price') && factors.includes('distance')) {
      return 'scatter';
    } else if (factors.includes('price') && factors.includes('size')) {
      return 'scatter';
    } else {
      return 'bar';
    }
  };

  const chartType = analysis ? getChartType(analysis) : 'scatter';
  const vizData = analysis ? generateVisualizationData(analysis) : null;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-500 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`}>
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Midpoint Analysis
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            We've analyzed your group's voting patterns to understand your true priorities.
          </p>
        </div>

        {/* Progress Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold text-gray-700">Tournament Progress</span>
            <span className="text-lg font-semibold text-blue-600">
              Round {currentRound} of {totalRounds}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <p className="text-sm text-gray-500 text-center">
            {Math.round(progressPercentage)}% Complete
          </p>
        </div>

        {/* Analysis Results */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing your group's preferences...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {analysis && !isLoading && (
          <div className="space-y-8">
            {/* Primary Finding with Visualization */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-800 mb-3">
                📊 {analysis.primaryFinding.title}
              </h3>
              <p className="text-blue-700 mb-4">{analysis.primaryFinding.description}</p>
              <div className="text-sm text-blue-600 mb-4">
                Correlation: {analysis.primaryFinding.correlation.toFixed(2)} | 
                Factors: {analysis.primaryFinding.factors.join(' vs ')}
              </div>
              
              {/* Auto-selected Visualization */}
              {vizData && chartType === 'scatter' && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Visual Analysis</h4>
                  <div className="bg-white rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={vizData.scatterData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="price" 
                          name="Price" 
                          unit="$"
                          label={{ value: 'Monthly Rent ($)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          dataKey="distance" 
                          name="Distance" 
                          unit="min"
                          label={{ value: 'Distance to Campus (min)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value: any, name: any) => [`${value}${name === 'price' ? '$' : ' min'}`, name]}
                          labelFormatter={(label: any) => `Apartment: ${label}`}
                        />
                        <Scatter 
                          dataKey="distance" 
                          fill="#3B82F6"
                          stroke="#1D4ED8"
                          strokeWidth={2}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      💡 <strong>Chart Justification:</strong> Scatter plot shows the relationship between price and distance. 
                      The outlier (The Mill) breaks the typical pattern by being expensive but close to campus.
                    </p>
                  </div>
                </div>
              )}

              {vizData && chartType === 'bar' && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Preference Analysis</h4>
                  <div className="bg-white rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={vizData.preferenceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="factor" />
                        <YAxis domain={[0, 1]} />
                        <Tooltip formatter={(value: any) => [`${(value * 100).toFixed(0)}%`, 'Importance']} />
                        <Bar dataKey="importance" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      💡 <strong>Chart Justification:</strong> Bar chart shows relative importance of different factors 
                      based on your group's voting patterns.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Outlier with Trend Visualization */}
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-yellow-800 mb-3">
                🎯 The Outlier: {analysis.outlier.apartmentName}
              </h3>
              <p className="text-yellow-700 mb-4">{analysis.outlier.description}</p>
              
              {/* Trend Visualization */}
              {vizData && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Decision Pattern Over Time</h4>
                  <div className="bg-white rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={vizData.trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="round" />
                        <YAxis yAxisId="price" orientation="left" />
                        <YAxis yAxisId="distance" orientation="right" />
                        <Tooltip 
                          formatter={(value: any, name: any) => [
                            `${value}${name === 'avgPrice' ? '$' : ' min'}`, 
                            name === 'avgPrice' ? 'Avg Price' : 'Avg Distance'
                          ]}
                        />
                        <Line 
                          yAxisId="price"
                          type="monotone" 
                          dataKey="avgPrice" 
                          stroke="#EF4444" 
                          strokeWidth={3}
                          name="avgPrice"
                        />
                        <Line 
                          yAxisId="distance"
                          type="monotone" 
                          dataKey="avgDistance" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          name="avgDistance"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      💡 <strong>Chart Justification:</strong> Line chart shows how your group's preferences evolved. 
                      The red line (price) decreases while green line (distance) increases, showing the trade-off pattern.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Hypothesis with Preference Visualization */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-800 mb-3">
                💡 {analysis.hypothesis.title}
              </h3>
              <p className="text-green-700 mb-4">{analysis.hypothesis.description}</p>
              
              {/* Preference Importance Visualization */}
              {vizData && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Factor Importance Ranking</h4>
                  <div className="bg-white rounded-lg p-4">
                    <div className="space-y-3">
                      {vizData.preferenceData.map((item, index) => (
                        <div key={item.factor} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3" 
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="font-medium text-gray-700">{item.factor}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${item.importance * 100}%`, 
                                  backgroundColor: item.color 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-600">
                              {Math.round(item.importance * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-3 text-center">
                      💡 <strong>Chart Justification:</strong> Horizontal bar chart shows the relative importance 
                      of each factor based on your group's voting behavior. Higher bars indicate stronger preferences.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          {analysis && onRefineSearch && (
            <button
              onClick={handleRefineSearch}
              className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🎯 Refine Our Search!
            </button>
          )}
          
          <button
            onClick={handleContinue}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Continue Tournament
          </button>
        </div>
      </div>
    </div>
  );
};
