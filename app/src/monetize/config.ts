

export interface ProOffer {
  
  price: string | null;
  
  checkoutUrl: string | null;
  
  benefits: { zh: string; en: string; vi: string }[];
}

export interface AdsConfig {
  
  provider: string | null;
}

export interface DonateConfig {
  
  href: string | null;
}

export const MONETIZE: { pro: ProOffer; ads: AdsConfig; donate: DonateConfig } = {
  pro: { price: null, checkoutUrl: null, benefits: [] },
  ads: { provider: null },
  donate: { href: null },
};
