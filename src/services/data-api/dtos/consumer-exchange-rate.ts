export interface RateValue {
  date: string | null;
  value: number | null;
}

export interface DollarRate {
  sell: RateValue;
  buy: RateValue;
}

export interface EuroRate {
  date: string | null;
  dollars: number | null;
  colones: number | null;
}

export interface ExchangeRates {
  dollar: DollarRate;
  euro: EuroRate;
}

export interface GetExchangeRateParams {
  iso_code: string;
}
