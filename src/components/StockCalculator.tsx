// components/StockCalculator.tsx 파일 생성 후 아래 내용 입력
'use client';  // 이 줄을 파일 최상단에 추가
import React, { useState } from 'react';

const StockCalculator = () => {
  const [ticker, setTicker] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previousTickers] = useState(['SOXL', 'TQQQ', 'UPRO']);

  const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

  const fetchStockData = async (symbol) => {
    try {
      // 현재가 조회
      const quoteResponse = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );
      const quoteData = await quoteResponse.json();

      if (!quoteData || !quoteData.c) {
        throw new Error('현재가 조회 실패');
      }

      // 2년치 일간 데이터 조회
      const toDate = Math.floor(Date.now() / 1000);
      const fromDate = toDate - (730 * 24 * 60 * 60);

      const candleResponse = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`
      );
      const candleData = await candleResponse.json();

      if (candleData.s !== 'ok' || !candleData.c || candleData.c.length === 0) {
        throw new Error('히스토리 데이터 조회 실패');
      }

      // 종가 데이터로 표준편차 계산
      const closePrices = candleData.c;
      const currentPrice = quoteData.c;
      
      const avgPrice = closePrices.reduce((a, b) => a + b, 0) / closePrices.length;
      const stdDev = Math.sqrt(
        closePrices.reduce((sq, n) => sq + Math.pow(n - avgPrice, 2), 0) / 
        (closePrices.length - 1)
      );

      // 20일 이동평균 계산
      const recent20Prices = closePrices.slice(0, 20);
      const ma20 = recent20Prices.reduce((a, b) => a + b, 0) / 20;

      return {
        currentPrice,
        stdDev,
        ma20,
        minusOneSigma: currentPrice - stdDev,
        minusTwoSigma: currentPrice - (2 * stdDev),
        priceChange: quoteData.dp,
        dayHigh: quoteData.h,
        dayLow: quoteData.l
      };
    } catch (error) {
      console.error('Error:', error);
      throw error;
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
        priceChange: data.priceChange?.toFixed(2) || '0.00',
        dayRange: `${data.dayLow.toFixed(2)} - ${data.dayHigh.toFixed(2)}`,
        ma20: data.ma20.toFixed(2)
      });
    } catch (error) {
      setError('데이터 조회 실패. 잠시 후 다시 시도해주세요.');
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
                // 티커 선택 즉시 계산 시작
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
          <div className="mt-6 p-4 bg-blue-50 rounded space-y-3">
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
        )}
      </div>
    </div>
  );
};

export default StockCalculator;
