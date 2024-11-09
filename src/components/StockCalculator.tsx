/* eslint-disable no-console */
'use client';

'use client';

import React, { useState } from 'react';

interface StockData {
  currentPrice: number;
  stdDev: number;
  ma20: number;
  minusOneSigma: number;
  minusTwoSigma: number;
  priceChange: number;
  dayHigh: number;
  dayLow: number;
  additionalInfo: {
    volatility: string;
    daysOfData: number;
    periodHigh: string;
    periodLow: string;
    startDate: string;
    endDate: string;
  };
}

interface ResultData {
  ticker: string;
  currentPrice: string;
  buyPrice: string;
  deviation: string;
  priceChange: string;
  dayRange: string;
  ma20: string;
  additionalInfo: {
    volatility: string;
    daysOfData: number;
    periodHigh: string;
    periodLow: string;
    startDate: string;
    endDate: string;
  };
}

const StockCalculator = () => {
  const [ticker, setTicker] = useState('');
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousTickers] = useState(['SOXL', 'TQQQ', 'UPRO']);

  const fetchStockData = async (symbol: string): Promise<StockData> => {
    try {
      const ALPHA_VANTAGE_KEY = '31Q5GSX6MUTPKNSM';
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${ALPHA_VANTAGE_KEY}`
      );
      
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      if (data['Note']) {
        throw new Error(data['Note']);
      }

      const timeSeriesData = data['Time Series (Daily)'];
      if (!timeSeriesData) {
        throw new Error(`데이터 조회 실패: ${JSON.stringify(data)}`);
      }

      // 날짜별 데이터를 배열로 변환
      const dates = Object.keys(timeSeriesData).sort().reverse();
      
      // 2년치 데이터 추출 (약 504 거래일)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      // 2년치 데이터만 필터링
      const filteredDates = dates.filter(date => new Date(date) >= twoYearsAgo);
      const closePrices = filteredDates.map(date => parseFloat(timeSeriesData[date]['4. close']));

      // 현재가 (가장 최근 종가)
      const currentPrice = closePrices[0];

      // 2년 데이터 기반 표준편차 계산
      const avgPrice = closePrices.reduce((a, b) => a + b, 0) / closePrices.length;
      const stdDev = Math.sqrt(
        closePrices.reduce((sq, n) => sq + Math.pow(n - avgPrice, 2), 0) / 
        (closePrices.length - 1)
      );

      // 20일 이동평균
      const recent20Prices = closePrices.slice(0, 20);
      const ma20 = recent20Prices.reduce((a, b) => a + b, 0) / 20;

      // 일간 변동률
      const previousPrice = closePrices[1];
      const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

      // 당일 고가/저가
      const todayData = timeSeriesData[dates[0]];
      const dayHigh = parseFloat(todayData['2. high']);
      const dayLow = parseFloat(todayData['3. low']);

      // 추가 통계 계산
      const volatility = (stdDev / avgPrice) * 100; // 변동성(%)
      const highest = Math.max(...closePrices);
      const lowest = Math.min(...closePrices);

      return {
        currentPrice,
        stdDev,
        ma20,
        minusOneSigma: currentPrice - stdDev,
        minusTwoSigma: currentPrice - (2 * stdDev),
        priceChange,
        dayHigh,
        dayLow,
        additionalInfo: {
          volatility: volatility.toFixed(2) + '%',
          daysOfData: filteredDates.length,
          periodHigh: highest.toFixed(2),
          periodLow: lowest.toFixed(2),
          startDate: filteredDates[filteredDates.length-1],
          endDate: filteredDates[0]
        }
      };

    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('알 수 없는 오류가 발생했습니다.');
    }
  };

  const calculateBuyLevel = async () => {
    if (!ticker) {
      setError('티커를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchStockData(ticker);
      
      setResult({
        ticker,
        currentPrice: data.currentPrice.toFixed(2),
        buyPrice: data.minusOneSigma.toFixed(2),
        deviation: "-1.00",
        priceChange: data.priceChange.toFixed(2),
        dayRange: `${data.dayLow.toFixed(2)} - ${data.dayHigh.toFixed(2)}`,
        ma20: data.ma20.toFixed(2),
        additionalInfo: data.additionalInfo
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('데이터 조회 실패. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow">
      <h1 className="text-lg font-bold mb-4">매수가 계산기</h1>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {previousTickers.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTicker(t);
                setError(null);
                setTimeout(() => calculateBuyLevel(), 100);
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="티커 입력"
              className="flex-1 px-3 py-2 border rounded text-sm"
            />
            <button
              onClick={calculateBuyLevel}
              disabled={loading}
              className={`px-4 py-2 rounded text-sm text-white ${
                loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? '계산 중...' : '계산'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            {/* 기본 정보 카드 */}
            <div className="p-4 bg-blue-50 rounded space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">티커:</div>
                <div className="font-medium">{result.ticker}</div>
                
                <div className="text-gray-600">현재가:</div>
                <div className="font-medium">
                  ${result.currentPrice}
                  <span className={`ml-2 text-xs ${
                    parseFloat(result.priceChange) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ({result.priceChange}%)
                  </span>
                </div>
                
                <div className="text-gray-600">당일 범위:</div>
                <div className="font-medium text-gray-600">${result.dayRange}</div>

                <div className="text-gray-600">20일 평균:</div>
                <div className="font-medium">${result.ma20}</div>
                
                <div className="text-gray-600">1차 매수가:</div>
                <div className="font-medium text-blue-600">${result.buyPrice}</div>
                
                <div className="text-gray-600">표준편차:</div>
                <div className="font-medium">{result.deviation}σ</div>
              </div>
            </div>

            {/* 추가 통계 정보 카드 */}
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-3 text-sm">2년 데이터 분석</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">분석 기간:</div>
                <div className="font-medium">
                  {new Date(result.additionalInfo.startDate).toLocaleDateString()} ~ 
                  {new Date(result.additionalInfo.endDate).toLocaleDateString()}
                </div>

                <div className="text-gray-600">데이터 수:</div>
                <div className="font-medium">{result.additionalInfo.daysOfData}일</div>

                <div className="text-gray-600">기간 최고가:</div>
                <div className="font-medium">${result.additionalInfo.periodHigh}</div>

                <div className="text-gray-600">기간 최저가:</div>
                <div className="font-medium">${result.additionalInfo.periodLow}</div>

                <div className="text-gray-600">변동성:</div>
                <div className="font-medium">{result.additionalInfo.volatility}</div>
              </div>
            </div>

            {/* 매수 전략 카드 */}
            <div className="p-4 bg-green-50 rounded">
              <h3 className="font-semibold mb-2 text-sm">매수 전략 가이드</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>현재가 기준 매수 시작</li>
                <li>-1σ ~ -2σ 구간에서 분할 매수</li>
                <li>변동성 {result.additionalInfo.volatility} 고려</li>
                <li>2년 기준 매수 가능 범위: ${result.additionalInfo.periodLow} ~ ${result.additionalInfo.periodHigh}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockCalculator;