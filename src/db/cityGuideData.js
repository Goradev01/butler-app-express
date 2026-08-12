const CITY_GUIDE_CATEGORIES = [
  { id: 'food_drink', name: 'Food & Drink', icon: '🍽️' },
  { id: 'culture', name: 'Culture', icon: '🎨' },
  { id: 'entertainment', name: 'Entertainment & Recreation', icon: '🎭' },
  { id: 'lodging', name: 'Lodging', icon: '🏨' },
  { id: 'health_wellness', name: 'Health & Wellness', icon: '🩺' },
  { id: 'sports', name: 'Sports', icon: '🤺' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'services', name: 'Services', icon: '💈' },
  { id: 'transportation', name: 'Transportation', icon: '🚇' },
  { id: 'finance', name: 'Finance', icon: '🏦' },
  { id: 'automotive', name: 'Automotive', icon: '🏎️' },
  { id: 'worship', name: 'Places of Worship', icon: '🏛️' }
];

const INITIAL_CITY_PLACES = [
  // --- FOOD & DRINK ---
  {
    id: 'place_fd_1',
    city: 'London',
    category: 'Food & Drink',
    categoryId: 'food_drink',
    name: 'Monmouth Coffee Company',
    description: 'Specialty coffee roasters serving single-origin drip coffees in the heart of Seven Dials.',
    address: '27 Monmouth St, Seven Dials, London WC2H 9EU',
    rating: 4.8,
    reviewsCount: 312,
    distance: '0.3 miles away',
    status: 'Open Now',
    phone: '+44 20 7240 2934',
    website: 'https://monmouthcoffee.co.uk',
    lat: 51.5135,
    lng: -0.1264,
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'place_fd_2',
    city: 'London',
    category: 'Food & Drink',
    categoryId: 'food_drink',
    name: 'Claridge\'s Bar',
    description: 'Iconic art deco bar serving vintage champagnes and bespoke cocktails in Mayfair.',
    address: 'Brook St, Mayfair, London W1K 4HR',
    rating: 4.9,
    reviewsCount: 520,
    distance: '0.6 miles away',
    status: 'Open Now',
    phone: '+44 20 7629 8860',
    website: 'https://claridges.co.uk',
    lat: 51.5126,
    lng: -0.1482,
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'place_fd_3',
    city: 'London',
    category: 'Food & Drink',
    categoryId: 'food_drink',
    name: 'The Wolseley',
    description: 'Grand European cafe & restaurant in Piccadilly known for traditional afternoon tea & breakfast.',
    address: '160 Piccadilly, St. James\'s, London W1J 9EB',
    rating: 4.7,
    reviewsCount: 890,
    distance: '0.8 miles away',
    status: 'Open Now',
    phone: '+44 20 7499 6996',
    website: 'https://thewolseley.com',
    lat: 51.5074,
    lng: -0.1412,
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=400&q=80'
  },

  // --- CULTURE ---
  {
    id: 'place_cult_1',
    city: 'London',
    category: 'Culture',
    categoryId: 'culture',
    name: 'The Seven Slate Monument',
    description: 'Historic architectural installation celebrating traditional masonry craftsmanship.',
    address: 'St Martin\'s Ln, London WC2N 4JS',
    rating: 4.9,
    reviewsCount: 140,
    distance: '0.4 miles away',
    status: 'Open Now',
    phone: '+44 20 7930 0089',
    website: 'https://royalacademy.org.uk',
    lat: 51.5098,
    lng: -0.1265,
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'place_cult_2',
    city: 'London',
    category: 'Culture',
    categoryId: 'culture',
    name: 'Royal Academy of Arts',
    description: 'World-renowned art institution showcasing contemporary and classical masters in Piccadilly.',
    address: 'Burlington House, Piccadilly, London W1J 0BD',
    rating: 4.8,
    reviewsCount: 650,
    distance: '0.7 miles away',
    status: 'Open Now',
    phone: '+44 20 7300 8000',
    website: 'https://royalacademy.org.uk',
    lat: 51.5092,
    lng: -0.1396,
    image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=400&q=80'
  },

  // --- ENTERTAINMENT & RECREATION ---
  {
    id: 'place_ent_1',
    city: 'London',
    category: 'Entertainment & Recreation',
    categoryId: 'entertainment',
    name: 'The Laughing Gallery',
    description: 'Exclusive subterranean comedy lounge & private performance space for gentlemen.',
    address: 'Gerrard St, Soho, London W1D 5PT',
    rating: 4.7,
    reviewsCount: 210,
    distance: '0.5 miles away',
    status: 'Open 6:00 PM',
    phone: '+44 20 7439 1200',
    website: 'https://soho-lounge.co.uk',
    lat: 51.5118,
    lng: -0.1308,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'place_ent_2',
    city: 'London',
    category: 'Entertainment & Recreation',
    categoryId: 'entertainment',
    name: 'Curzon Mayfair Cinema',
    description: 'Grade II listed luxury cinema featuring plush seating, bar, and film retrospectives.',
    address: '38 Curzon St, Mayfair, London W1J 7TY',
    rating: 4.8,
    reviewsCount: 340,
    distance: '0.9 miles away',
    status: 'Open Now',
    phone: '+44 20 7355 2400',
    website: 'https://curzon.com',
    lat: 51.5065,
    lng: -0.1478,
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'
  },

  // --- LODGING ---
  {
    id: 'place_lodge_1',
    city: 'London',
    category: 'Lodging',
    categoryId: 'lodging',
    name: 'The Connaught Hotel',
    description: '5-star luxury hotel in Mayfair with Michelin-starred dining & Aman Spa.',
    address: 'Carlos Pl, Mayfair, London W1K 2AL',
    rating: 4.9,
    reviewsCount: 780,
    distance: '0.6 miles away',
    status: 'Open 24 Hours',
    phone: '+44 20 7499 7070',
    website: 'https://the-connaught.co.uk',
    lat: 51.5101,
    lng: -0.1492,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'
  },

  // --- HEALTH & WELLNESS ---
  {
    id: 'place_well_1',
    city: 'London',
    category: 'Health & Wellness',
    categoryId: 'health_wellness',
    name: 'The Bath House - Banya No.1',
    description: 'Authentic Russian Banya & thermal spa featuring traditional parenie treatments and cold plunges.',
    address: '17 Micawber St, Hoxton, London N1 7TB',
    rating: 4.8,
    reviewsCount: 410,
    distance: '1.2 miles away',
    status: 'Open Now',
    phone: '+44 20 7253 6723',
    website: 'https://banya.co.uk',
    lat: 51.5284,
    lng: -0.0945,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80'
  },

  // --- SPORTS ---
  {
    id: 'place_sport_1',
    city: 'London',
    category: 'Sports',
    categoryId: 'sports',
    name: 'Lansdowne Fencing & Sports Club',
    description: 'Historic fencing academy and athletic training center catering to gentlemen competitors.',
    address: '9 Fitzmaurice Pl, Mayfair, London W1J 5JD',
    rating: 4.9,
    reviewsCount: 195,
    distance: '0.7 miles away',
    status: 'Open Now',
    phone: '+44 20 7629 7200',
    website: 'https://lansdowneclub.com',
    lat: 51.5085,
    lng: -0.1462,
    image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=400&q=80'
  },

  // --- SHOPPING ---
  {
    id: 'place_shop_1',
    city: 'London',
    category: 'Shopping',
    categoryId: 'shopping',
    name: 'Henry Poole & Co (Savile Row)',
    description: 'Founders of Savile Row bespoke tailoring crafting handmade suiting for royalty & gentlemen.',
    address: '15 Savile Row, Mayfair, London W1S 3PJ',
    rating: 5.0,
    reviewsCount: 280,
    distance: '0.6 miles away',
    status: 'Open Now',
    phone: '+44 20 7734 5985',
    website: 'https://henrypoole.com',
    lat: 51.5115,
    lng: -0.1398,
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=400&q=80'
  },

  // --- SERVICES ---
  {
    id: 'place_serv_1',
    city: 'London',
    category: 'Services',
    categoryId: 'services',
    name: 'Geo. F. Trumper Barber & Grooming',
    description: 'Master barbers offering classic hot towel wet shaves and traditional gentleman fragrances.',
    address: '9 Curzon St, Mayfair, London W1J 5HQ',
    rating: 4.9,
    reviewsCount: 460,
    distance: '0.8 miles away',
    status: 'Open Now',
    phone: '+44 20 7499 1850',
    website: 'https://trumpers.com',
    lat: 51.5071,
    lng: -0.1458,
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80'
  },

  // --- TRANSPORTATION ---
  {
    id: 'place_trans_1',
    city: 'London',
    category: 'Transportation',
    categoryId: 'transportation',
    name: 'St Pancras International Station',
    description: 'Victorian architectural landmark & high-speed Eurostar terminal connecting London to Europe.',
    address: 'Euston Rd, London N1C 4QP',
    rating: 4.7,
    reviewsCount: 1200,
    distance: '1.4 miles away',
    status: 'Open 24 Hours',
    phone: '+44 20 7843 7688',
    website: 'https://stpancras.com',
    lat: 51.5314,
    lng: -0.1261,
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=80'
  },

  // --- FINANCE ---
  {
    id: 'place_fin_1',
    city: 'London',
    category: 'Finance',
    categoryId: 'finance',
    name: 'Coutts & Co Private Bank',
    description: 'Prestigious private bank and wealth manager established in 1692 serving high-net-worth clients.',
    address: '440 Strand, London WC2R 0QS',
    rating: 4.9,
    reviewsCount: 150,
    distance: '0.4 miles away',
    status: 'Open Now',
    phone: '+44 20 7753 1000',
    website: 'https://coutts.com',
    lat: 51.5096,
    lng: -0.1235,
    image: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=400&q=80'
  },

  // --- AUTOMOTIVE ---
  {
    id: 'place_auto_1',
    city: 'London',
    category: 'Automotive',
    categoryId: 'automotive',
    name: 'Jack Barclay Bentley Mayfair',
    description: 'The world\'s oldest Bentley showroom offering flagship luxury automotive models & bespoke tailoring.',
    address: '18 Berkeley Square, Mayfair, London W1J 6AE',
    rating: 4.9,
    reviewsCount: 310,
    distance: '0.7 miles away',
    status: 'Open Now',
    phone: '+44 20 7499 6151',
    website: 'https://hr-owen.co.uk',
    lat: 51.5091,
    lng: -0.1448,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80'
  },

  // --- PLACES OF WORSHIP ---
  {
    id: 'place_worship_1',
    city: 'London',
    category: 'Places of Worship',
    categoryId: 'worship',
    name: 'Westminster Abbey',
    description: 'Historic Royal Church and UNESCO World Heritage site standing at the center of British history.',
    address: '20 Dean\'s Yard, London SW1P 3PA',
    rating: 4.9,
    reviewsCount: 2400,
    distance: '0.9 miles away',
    status: 'Open Now',
    phone: '+44 20 7222 5152',
    website: 'https://westminster-abbey.org',
    lat: 51.4993,
    lng: -0.1273,
    image: 'https://images.unsplash.com/photo-1548625361-185633469036?auto=format&fit=crop&w=400&q=80'
  }
];

module.exports = {
  CITY_GUIDE_CATEGORIES,
  INITIAL_CITY_PLACES
};
