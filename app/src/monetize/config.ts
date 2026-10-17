

interface ProOffer {
  
  price: string | null;
  
  checkoutUrl: string | null;
  
  benefits: { zh: string; en: string; vi: string }[];
}

interface AdsConfig {
  
  provider: string | null;
}

interface DonateConfig {
  
  href: string | null;
}

export const MONETIZE: { pro: ProOffer; ads: AdsConfig; donate: DonateConfig } = {
  pro: { price: null, checkoutUrl: null, benefits: [] },
  ads: { provider: null },
  donate: { href: null },
};
