const INITIAL_COUNTRIES = [
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    capital: 'Paris',
    currency: 'EUR (€)',
    currencyCode: 'EUR',
    dialingCode: '+33',
    timezone: 'CET (UTC+1) / CEST (UTC+2)',
    languages: ['French'],
    plugTypes: ['Type C', 'Type E'],
    emergencyNumbers: {
      general: '112',
      police: '17',
      ambulance: '15 (SAMU)',
      fire: '18',
      healthcareNotes: 'SAMU provides 24/7 medical emergency assistance nationwide.'
    },
    hospitals: [
      { name: 'Hôpital Pitié-Salpêtrière', city: 'Paris', phone: '+33 1 42 16 00 00', address: '47-83 Bd de l\'Hôpital, 75013 Paris' },
      { name: 'American Hospital of Paris', city: 'Neuilly-sur-Seine', phone: '+33 1 46 41 25 25', address: '63 Bd Victor Hugo, 92200' }
    ],
    gettingAround: {
      rideHailing: ['Uber', 'Bolt', 'G7 Taxi'],
      transitNotes: 'RATP Metro/RER in Paris. TGV high-speed rail connects major cities.',
      tippingEtiquette: 'Service is included (service compris), but leaving 5-10% for good service is appreciated.'
    },
    moneyTransfer: {
      recommendedServices: ['Wise', 'Revolut', 'SEPA Transfer', 'OFX'],
      exchangeRateInfo: '1 EUR ≈ 1.09 USD',
      notes: 'No currency controls within the Eurozone. Contactless cards widely accepted everywhere.'
    }
  },
  {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    capital: 'Tokyo',
    currency: 'JPY (¥)',
    currencyCode: 'JPY',
    dialingCode: '+81',
    timezone: 'JST (UTC+9)',
    languages: ['Japanese'],
    plugTypes: ['Type A', 'Type B'],
    emergencyNumbers: {
      general: '110 (Police) / 119 (Fire & Ambulance)',
      police: '110',
      ambulance: '119',
      fire: '119',
      healthcareNotes: 'English speaking medical helpline: Japan Health Info (+81 3 4330 2300).'
    },
    hospitals: [
      { name: 'St. Luke\'s International Hospital', city: 'Tokyo', phone: '+81 3 3541 5151', address: '9-1 Akashicho, Chuo City, Tokyo' },
      { name: 'Tokyo Medical Center', city: 'Tokyo', phone: '+81 3 3411 0111', address: '2-5-1 Higashigaoka, Meguro' }
    ],
    gettingAround: {
      rideHailing: ['GO Taxi', 'DiDi', 'Uber'],
      transitNotes: 'JR Shinkansen & Suica/Pasmo IC cards cover subways and trains nationwide with extreme punctuality.',
      tippingEtiquette: 'Tipping is not practiced in Japan and can be seen as impolite.'
    },
    moneyTransfer: {
      recommendedServices: ['Wise', 'Seven Bank ATMs', 'Revolut'],
      exchangeRateInfo: '1 USD ≈ 155 JPY',
      notes: 'Cash is still preferred in traditional shops, though IC cards & credit cards are widely accepted in urban centers.'
    }
  },
  {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    capital: 'Abuja',
    currency: 'NGN (₦)',
    currencyCode: 'NGN',
    dialingCode: '+234',
    timezone: 'WAT (UTC+1)',
    languages: ['English', 'Hausa', 'Yoruba', 'Igbo'],
    plugTypes: ['Type D', 'Type G'],
    emergencyNumbers: {
      general: '112 (National Emergency)',
      police: '112 / 199',
      ambulance: '112 (FRSC)',
      fire: '112 / 0803 200 3557',
      healthcareNotes: 'National Emergency Management Agency (NEMA) coordinates response.'
    },
    hospitals: [
      { name: 'Reddington Hospital', city: 'Lagos', phone: '+234 1 271 5340', address: '39 Idowu Martins St, Victoria Island' },
      { name: 'Nizamiye Hospital', city: 'Abuja', phone: '+234 818 888 8808', address: 'Cadastral Zone, Life Camp, Abuja' }
    ],
    gettingAround: {
      rideHailing: ['Bolt', 'Uber', 'Lagride', 'InDrive'],
      transitNotes: 'Uber & Bolt operate in Lagos and Abuja. BRT bus corridors operate in Lagos.',
      tippingEtiquette: 'Tipping 5-10% at restaurants is customary and appreciated.'
    },
    moneyTransfer: {
      recommendedServices: ['Lemfi', 'Send by Flutterwave', 'Wise', 'Remitly'],
      exchangeRateInfo: 'Direct bank transfers via NIBSS (Instant Payment) are standard.',
      notes: 'Naira transactions are heavily digitized; bank transfers & POS payments are used universally.'
    }
  },
  {
    code: 'UK',
    name: 'United Kingdom',
    flag: '🇬🇧',
    capital: 'London',
    currency: 'GBP (£)',
    currencyCode: 'GBP',
    dialingCode: '+44',
    timezone: 'GMT (UTC+0) / BST (UTC+1)',
    languages: ['English'],
    plugTypes: ['Type G'],
    emergencyNumbers: {
      general: '999 (Emergency) / 111 (NHS Non-Emergency)',
      police: '999',
      ambulance: '999',
      fire: '999',
      healthcareNotes: 'NHS 111 provides free 24/7 non-emergency medical advice.'
    },
    hospitals: [
      { name: 'St Thomas\' Hospital', city: 'London', phone: '+44 20 7188 7188', address: 'Westminster Bridge Rd, SE1 7EH' },
      { name: 'University College Hospital', city: 'London', phone: '+44 20 3456 7890', address: '235 Euston Rd, NW1 2BU' }
    ],
    gettingAround: {
      rideHailing: ['Uber', 'FreeNow', 'Bolt'],
      transitNotes: 'Oyster / Contactless pay-as-you-go across TfL Underground, buses, and Elizabeth Line.',
      tippingEtiquette: 'Service charge (12.5%) is often added to restaurant bills automatically.'
    },
    moneyTransfer: {
      recommendedServices: ['Wise', 'Revolut', 'Starling', 'OFX'],
      exchangeRateInfo: '1 GBP ≈ 1.27 USD',
      notes: 'Fully cashless environment; contactless card and Apple/Google Pay accepted everywhere.'
    }
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    capital: 'Washington D.C.',
    currency: 'USD ($)',
    currencyCode: 'USD',
    dialingCode: '+1',
    timezone: 'EST / CST / MST / PST',
    languages: ['English', 'Spanish'],
    plugTypes: ['Type A', 'Type B'],
    emergencyNumbers: {
      general: '911',
      police: '911',
      ambulance: '911',
      fire: '911',
      healthcareNotes: 'Ensure travel/health insurance before travel. 911 handles all immediate life safety emergencies.'
    },
    hospitals: [
      { name: 'Mayo Clinic', city: 'Rochester, MN', phone: '+1 507-284-2511', address: '200 First St SW' },
      { name: 'Mount Sinai Hospital', city: 'New York, NY', phone: '+1 212-241-6500', address: '1468 Madison Ave' }
    ],
    gettingAround: {
      rideHailing: ['Uber', 'Lyft'],
      transitNotes: 'Subway networks in NYC, Chicago, SF; driving/rideshares standard in most other cities.',
      tippingEtiquette: 'Tipping 18-20% is standard in restaurants and taxi services.'
    },
    moneyTransfer: {
      recommendedServices: ['Venmo', 'Zelle', 'Wise', 'PayPal'],
      exchangeRateInfo: 'World benchmark reserve currency.',
      notes: 'Credit cards and mobile wallets are used universally.'
    }
  }
];

module.exports = { INITIAL_COUNTRIES };
