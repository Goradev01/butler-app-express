const fs = require('fs');
const path = require('path');

// In-memory data store with JSON persistence
const DB_FILE = path.join(__dirname, 'data.json');

const INITIAL_HOUSES = [
  { id: 'arthur', name: 'Arthur', motto: 'THE ONCE AND FUTURE KING', description: 'Leadership, wisdom, courage, and noble vision.', matchingHobbies: ['Clubs & Membership', 'Self Development & Well-being'] },
  { id: 'lancelot', name: 'Lancelot', motto: 'STRENGTH THROUGH HONOUR', description: 'Chivalry, martial prowess, loyalty, and dedication.', matchingHobbies: ['Sports', 'Adventure & Exploration'] },
  { id: 'galahad', name: 'Galahad', motto: 'PURITY OF PURPOSE', description: 'Integrity, spiritual depth, focus, and nobility.', matchingHobbies: ['Self Development & Well-being', 'Arts and Culture'] },
  { id: 'percival', name: 'Percival', motto: 'PASSION AND DEVOTION', description: 'Curiosity, heart, steadfast determination, and quest for truth.', matchingHobbies: ['Lifestyle', 'Arts and Culture', 'Adventure & Exploration'] },
  { id: 'gawain', name: 'Gawain', motto: 'STRENGTH OF THE SUN', description: 'Vitality, resilience, brotherhood, and honor under heat.', matchingHobbies: ['Sports', 'Games'] },
  { id: 'tristan', name: 'Tristan', motto: 'PASSION AND DEVOTION', description: 'Artistic spirit, romance, heroism, and eloquence.', matchingHobbies: ['Arts and Culture', 'Lifestyle'] },
  { id: 'bedivere', name: 'Bedivere', motto: 'LOYALTY BEYOND MEASURE', description: 'Steadfast allegiance, reliability, calm wisdom, and duty.', matchingHobbies: ['Clubs & Membership', 'Lifestyle'] },
  { id: 'morien', name: 'Morien', motto: 'MYSTERY OF THE MOON', description: 'Intuition, tactical mind, nocturnal focus, and resilience.', matchingHobbies: ['Games', 'Adventure & Exploration'] },
  { id: 'lamorak', name: 'Lamorak', motto: 'UNBRIDLED POWER', description: 'Fierce independence, vigor, passion, and boundless drive.', matchingHobbies: ['Sports', 'Games'] },
  { id: 'bors', name: 'Bors', motto: 'JUSTICE AND BALANCE', description: 'Fairness, moral discipline, humility, and strength.', matchingHobbies: ['Self Development & Well-being', 'Clubs & Membership'] },
  { id: 'aglovale', name: 'Aglovale', motto: 'LOYALTY BEYOND MEASURE', description: 'Quiet guardianship, perseverance, and unbreakable bonds.', matchingHobbies: ['Clubs & Membership', 'Lifestyle'] },
  { id: 'merlin', name: 'Merlin', motto: 'STRENGTH THROUGH HONOUR', description: 'Strategic genius, deep knowledge, mastery, and guidance.', matchingHobbies: ['Games', 'Arts and Culture', 'Self Development & Well-being'] }
];

const INITIAL_HOBBIES = [
  { id: 'arts', name: 'Arts and Culture', category: 'Creative' },
  { id: 'sports', name: 'Sports', category: 'Active' },
  { id: 'games', name: 'Games', category: 'Recreation' },
  { id: 'lifestyle', name: 'Lifestyle', category: 'Living' },
  { id: 'adventure', name: 'Adventure & Exploration', category: 'Outdoors' },
  { id: 'clubs', name: 'Clubs & Membership', category: 'Social' },
  { id: 'self_dev', name: 'Self Development & Well-being', category: 'Growth' }
];

const INITIAL_FEEDS = [
  {
    id: 'feed_1',
    author: 'Sir Galahad',
    authorHouse: 'Galahad',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    title: 'The Great Autumn Gala Announcement',
    content: 'We invite all gentlemen of the 12 Houses to join us for our annual fellowship dinner at the Grand Hall.',
    category: 'Clubs & Membership',
    houseId: 'galahad',
    likes: 24,
    commentsCount: 5,
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'feed_2',
    author: 'Percival',
    authorHouse: 'Percival',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    title: 'Masterclass: Art of High-Speed Fencing',
    content: 'House Percival will host an exclusive training session covering speed, grace, and chivalrous sportsmanship.',
    category: 'Sports',
    houseId: 'percival',
    likes: 42,
    commentsCount: 12,
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'feed_3',
    author: 'Merlin',
    authorHouse: 'Merlin',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    title: 'Strategic Chess & Philosophy Tournament',
    content: 'Test your tactical brilliance in our upcoming monthly gentlemen chess league. Open to all houses.',
    category: 'Games',
    houseId: 'merlin',
    likes: 18,
    commentsCount: 3,
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

class DatabaseStore {
  constructor() {
    this.users = new Map(); // id -> user object
    this.verificationCodes = new Map(); // email -> code
    this.houses = INITIAL_HOUSES;
    this.hobbies = INITIAL_HOBBIES;
    this.feeds = [...INITIAL_FEEDS];
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.users) {
          parsed.users.forEach(u => this.users.set(u.id, u));
        }
        if (parsed.feeds) {
          this.feeds = parsed.feeds;
        }
      }
    } catch (err) {
      console.warn('Failed to load local database, initializing fresh store', err.message);
    }
  }

  saveData() {
    try {
      const data = {
        users: Array.from(this.users.values()),
        feeds: this.feeds
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist database:', err.message);
    }
  }

  // Users
  createUser(email, passwordHash) {
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    
    const user = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      isVerified: false,
      verificationCode,
      createdAt: new Date().toISOString(),
      profile: null,
      hobbies: [],
      joinedHouse: null
    };

    this.users.set(userId, user);
    this.saveData();
    return user;
  }

  findUserByEmail(email) {
    const cleanEmail = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === cleanEmail) return user;
    }
    return null;
  }

  findUserById(id) {
    return this.users.get(id) || null;
  }

  verifyUserEmail(email, code) {
    const user = this.findUserByEmail(email);
    if (!user) return { success: false, message: 'User not found' };
    if (user.isVerified) return { success: true, message: 'Already verified' };
    if (user.verificationCode !== String(code).trim()) {
      return { success: false, message: 'Invalid verification code. Use code: ' + user.verificationCode };
    }
    user.isVerified = true;
    this.saveData();
    return { success: true, user };
  }

  updateProfile(userId, profileData) {
    const user = this.findUserById(userId);
    if (!user) return null;
    user.profile = {
      preferredTitle: profileData.preferredTitle || '',
      fullName: profileData.fullName || '',
      dateOfBirth: profileData.dateOfBirth || '',
      emailAddress: profileData.emailAddress || user.email,
      phoneNumber: profileData.phoneNumber || '',
      phoneCountryCode: profileData.phoneCountryCode || '+1',
      country: profileData.country || '',
      regionalState: profileData.regionalState || '',
      city: profileData.city || '',
      postcode: profileData.postcode || '',
      profilePictureUrl: profileData.profilePictureUrl || user.profile?.profilePictureUrl || ''
    };
    this.saveData();
    return user;
  }

  setUserHobbies(userId, hobbiesArray) {
    const user = this.findUserById(userId);
    if (!user) return null;
    user.hobbies = hobbiesArray;
    this.saveData();
    return user;
  }

  setUserHouse(userId, houseId) {
    const user = this.findUserById(userId);
    if (!user) return null;
    const house = this.houses.find(h => h.id === houseId);
    if (!house) return null;
    user.joinedHouse = house;
    this.saveData();
    return user;
  }

  // Recommendation engine for 12 Houses
  recommendHouse(userHobbies = []) {
    if (!userHobbies || userHobbies.length === 0) {
      return this.houses.find(h => h.id === 'percival');
    }

    // Score houses based on hobbies match
    let bestHouse = this.houses[0];
    let maxScore = -1;

    for (const house of this.houses) {
      let score = 0;
      house.matchingHobbies.forEach(h => {
        if (userHobbies.includes(h)) score += 2;
      });
      if (score > maxScore) {
        maxScore = score;
        bestHouse = house;
      }
    }
    return bestHouse;
  }

  // Feed items
  getFeeds(userHouseId = null, filterCategory = null) {
    let result = [...this.feeds];
    if (filterCategory) {
      result = result.filter(f => f.category === filterCategory);
    }
    return result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  createFeedPost(userId, { title, content, category }) {
    const user = this.findUserById(userId);
    const newPost = {
      id: 'feed_' + Date.now(),
      author: user?.profile?.fullName || user?.email || 'Anonymous Gentleman',
      authorHouse: user?.joinedHouse?.name || 'Member',
      authorAvatar: user?.profile?.profilePictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      title,
      content,
      category: category || 'General',
      houseId: user?.joinedHouse?.id || 'general',
      likes: 0,
      commentsCount: 0,
      timestamp: new Date().toISOString()
    };
    this.feeds.unshift(newPost);
    this.saveData();
    return newPost;
  }

  likeFeedPost(postId) {
    const post = this.feeds.find(f => f.id === postId);
    if (post) {
      post.likes += 1;
      this.saveData();
      return post;
    }
    return null;
  }
}

module.exports = new DatabaseStore();
