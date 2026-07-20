/**
 * FLASHPOINT seed market data — 21 conflict-sensitive assets.
 * Source: Yahoo Finance plugin snapshot · snapshot as of 2026-07-17T04:00:00.000Z
 * Copied verbatim from /mnt/agents/output/seed_market_data.json (design.md §9).
 */

export type MarketCategory =
  | "indices"
  | "futures"
  | "energy"
  | "metals"
  | "fx"
  | "bigtech";

export interface MarketAsset {
  ticker: string;
  name: string;
  category: MarketCategory;
  unit: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  asOf: string;
  series: number[];
}

export interface SeedMarketData {
  asOf: string;
  generatedAt: string;
  source: string;
  assets: MarketAsset[];
}

export const SEED_MARKET_DATA: SeedMarketData = {
  "asOf": "2026-07-17T04:00:00.000Z",
  "generatedAt": "2026-07-19",
  "source": "Yahoo Finance plugin snapshot",
  "assets": [
    {
      "ticker": "^GSPC",
      "name": "S&P 500",
      "category": "indices",
      "unit": "",
      "price": 7457.69,
      "prevClose": 7533.77,
      "change": -76.08,
      "changePct": -1.01,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        7500.58,
        7472.79,
        7365.46,
        7358.22,
        7357.49,
        7354.02,
        7440.43,
        7499.36,
        7483.23,
        7483.24,
        7537.43,
        7503.85,
        7482.71,
        7543.64,
        7575.39,
        7515.34,
        7543.59,
        7572.4,
        7533.77,
        7457.69
      ]
    },
    {
      "ticker": "^IXIC",
      "name": "NASDAQ Composite",
      "category": "indices",
      "unit": "",
      "price": 25520.24,
      "prevClose": 25881.95,
      "change": -361.71,
      "changePct": -1.4,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        25873.18,
        26107.01,
        26269.23,
        25881.95,
        25520.24
      ]
    },
    {
      "ticker": "^DJI",
      "name": "Dow Jones",
      "category": "indices",
      "unit": "",
      "price": 52146.42,
      "prevClose": 52552.97,
      "change": -406.55,
      "changePct": -0.77,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        52498.64,
        52508.27,
        52658.64,
        52552.97,
        52146.42
      ]
    },
    {
      "ticker": "^VIX",
      "name": "VIX Volatility",
      "category": "indices",
      "unit": "",
      "price": 18.77,
      "prevClose": 16.73,
      "change": 2.04,
      "changePct": 12.19,
      "asOf": "2026-07-17T05:00:00.000Z",
      "series": [
        18.44,
        16.4,
        17.28,
        19.49,
        18.63,
        18.89,
        18.41,
        17.65,
        16.45,
        16.59,
        16.15,
        15.57,
        16.13,
        16.9,
        15.84,
        15.03,
        17.16,
        16.5,
        15.67,
        16.73,
        18.77
      ]
    },
    {
      "ticker": "ES=F",
      "name": "S&P 500 Futures",
      "category": "futures",
      "unit": "",
      "price": 7497.75,
      "prevClose": 7577.75,
      "change": -80,
      "changePct": -1.06,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        7591.25,
        7614.75,
        7577.75,
        7497.75
      ]
    },
    {
      "ticker": "NQ=F",
      "name": "NASDAQ 100 Futures",
      "category": "futures",
      "unit": "",
      "price": 28773.25,
      "prevClose": 29225.75,
      "change": -452.5,
      "changePct": -1.55,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        29790.25,
        29693.25,
        29225.75,
        28773.25
      ]
    },
    {
      "ticker": "YM=F",
      "name": "Dow Futures",
      "category": "futures",
      "unit": "",
      "price": 52375,
      "prevClose": 52786,
      "change": -411,
      "changePct": -0.78,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        52791,
        52900,
        52786,
        52375
      ]
    },
    {
      "ticker": "CL=F",
      "name": "WTI Crude Oil",
      "category": "energy",
      "unit": "$/bbl",
      "price": 81.78,
      "prevClose": 78.95,
      "change": 2.83,
      "changePct": 3.58,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        74.82,
        73.21,
        70.34,
        71.92,
        69.23,
        70.75,
        69.5,
        68.58,
        68.69,
        68.55,
        70.44,
        73.52,
        72.08,
        71.41,
        78.14,
        79.34,
        79.6,
        78.95,
        81.78
      ]
    },
    {
      "ticker": "BZ=F",
      "name": "Brent Crude Oil",
      "category": "energy",
      "unit": "$/bbl",
      "price": 88.1,
      "prevClose": 84.23,
      "change": 3.87,
      "changePct": 4.59,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        77.9,
        77.08,
        73.74,
        75.26,
        71.99,
        73.15,
        72.92,
        71.57,
        71.8,
        71.99,
        74.16,
        78.02,
        76.3,
        76.01,
        83.3,
        84.73,
        84.95,
        84.23,
        88.1
      ]
    },
    {
      "ticker": "NG=F",
      "name": "Natural Gas",
      "category": "energy",
      "unit": "$/MMBtu",
      "price": 2.91,
      "prevClose": 2.86,
      "change": 0.05,
      "changePct": 1.85,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        2.9,
        2.92,
        2.86,
        2.91
      ]
    },
    {
      "ticker": "GC=F",
      "name": "Gold",
      "category": "metals",
      "unit": "$/oz",
      "price": 4018.8,
      "prevClose": 3985.6,
      "change": 33.2,
      "changePct": 0.83,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        4181.9,
        4129.9,
        3990.3,
        4030.5,
        4078.7,
        4022.3,
        4022.9,
        4068.3,
        4112.7,
        4155.1,
        4145.3,
        4070.9,
        4130.6,
        4104.1,
        3997,
        4061.1,
        4044,
        3985.6,
        4018.8
      ]
    },
    {
      "ticker": "SI=F",
      "name": "Silver",
      "category": "metals",
      "unit": "$/oz",
      "price": 56.33,
      "prevClose": 55.9,
      "change": 0.43,
      "changePct": 0.77,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        58.77,
        57.11,
        55.9,
        56.33
      ]
    },
    {
      "ticker": "DX-Y.NYB",
      "name": "US Dollar Index",
      "category": "fx",
      "unit": "",
      "price": 100.75,
      "prevClose": 100.73,
      "change": 0.02,
      "changePct": 0.02,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        101.02,
        101.41,
        101.61,
        101.43,
        101.36,
        101.11,
        101.19,
        101.39,
        100.86,
        100.85,
        101.14,
        101.05,
        100.94,
        100.97,
        101.28,
        100.94,
        100.5,
        100.73,
        100.75
      ]
    },
    {
      "ticker": "AAPL",
      "name": "Apple",
      "category": "bigtech",
      "unit": "",
      "price": 333.74,
      "prevClose": 333.26,
      "change": 0.48,
      "changePct": 0.14,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        317.31,
        314.86,
        327.5,
        333.26,
        333.74
      ]
    },
    {
      "ticker": "MSFT",
      "name": "Microsoft",
      "category": "bigtech",
      "unit": "",
      "price": 393.82,
      "prevClose": 401.1,
      "change": -7.28,
      "changePct": -1.82,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        390.99,
        384.93,
        395.63,
        401.1,
        393.82
      ]
    },
    {
      "ticker": "NVDA",
      "name": "NVIDIA",
      "category": "bigtech",
      "unit": "",
      "price": 202.81,
      "prevClose": 207.4,
      "change": -4.59,
      "changePct": -2.21,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        210.69,
        208.65,
        200.04,
        199,
        195.74,
        192.53,
        194.97,
        200.09,
        197.58,
        194.83,
        195.55,
        196.93,
        204.12,
        202.78,
        210.96,
        203.53,
        211.8,
        212.5,
        207.4,
        202.81
      ]
    },
    {
      "ticker": "AMZN",
      "name": "Amazon",
      "category": "bigtech",
      "unit": "",
      "price": 247.23,
      "prevClose": 249.89,
      "change": -2.66,
      "changePct": -1.06,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        247.31,
        247.49,
        254.96,
        249.89,
        247.23
      ]
    },
    {
      "ticker": "GOOGL",
      "name": "Alphabet",
      "category": "bigtech",
      "unit": "",
      "price": 346.77,
      "prevClose": 354.46,
      "change": -7.69,
      "changePct": -2.17,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        352.51,
        359.51,
        370.92,
        354.46,
        346.77
      ]
    },
    {
      "ticker": "META",
      "name": "Meta",
      "category": "bigtech",
      "unit": "",
      "price": 646.01,
      "prevClose": 664.54,
      "change": -18.53,
      "changePct": -2.79,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        656.73,
        661.04,
        681.31,
        664.54,
        646.01
      ]
    },
    {
      "ticker": "TSLA",
      "name": "Tesla",
      "category": "bigtech",
      "unit": "",
      "price": 380.84,
      "prevClose": 391.06,
      "change": -10.22,
      "changePct": -2.61,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        400.49,
        405.05,
        381.61,
        375.53,
        375.12,
        379.71,
        411.84,
        420.6,
        425.3,
        393.45,
        419.77,
        402.9,
        394.06,
        406.55,
        407.76,
        394.76,
        396.18,
        394.46,
        391.06,
        380.84
      ]
    },
    {
      "ticker": "AVGO",
      "name": "Broadcom",
      "category": "bigtech",
      "unit": "",
      "price": 370.83,
      "prevClose": 374.45,
      "change": -3.62,
      "changePct": -0.97,
      "asOf": "2026-07-17T04:00:00.000Z",
      "series": [
        384.05,
        389.11,
        394.28,
        374.45,
        370.83
      ]
    }
  ]
};
