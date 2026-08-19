const fs = require('fs');
const path = require('path');
const { INITIAL_COUNTRIES } = require('./worldGuideData');
const { FORUM_CATEGORIES, INITIAL_DISCUSSIONS, INITIAL_NOTIFICATIONS } = require('./forumData');
const { INITIAL_MULTILEVEL_FEEDS } = require('./feedLevelsData');
const { CITY_GUIDE_CATEGORIES, INITIAL_CITY_PLACES } = require('./cityGuideData');

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
    this.feeds = [...INITIAL_MULTILEVEL_FEEDS, ...INITIAL_FEEDS];
    this.countries = [...INITIAL_COUNTRIES];
    this.savedCountries = new Set(['FR', 'JP']); // default saved codes
    this.forumCategories = [...FORUM_CATEGORIES];
    this.discussions = [...INITIAL_DISCUSSIONS];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.cityCategories = [...CITY_GUIDE_CATEGORIES];
    this.cityPlaces = [...INITIAL_CITY_PLACES];
    this.userRsvps = new Set();
    this.placeBookings = [];
    this.conversations = new Map(); // id -> conversation object
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
        if (parsed.feeds && parsed.feeds.length > 0) {
          // Merge multilevel feeds with stored user feeds
          const existingIds = new Set(parsed.feeds.map(f => f.id));
          const initialNew = INITIAL_MULTILEVEL_FEEDS.filter(f => !existingIds.has(f.id));
          this.feeds = [...initialNew, ...parsed.feeds];
        }
        if (parsed.conversations && parsed.conversations.length > 0) {
          parsed.conversations.forEach(c => this.conversations.set(c.id, c));
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
        feeds: this.feeds,
        conversations: Array.from(this.conversations.values())
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

  // --- WORLD GUIDE METHODS ---
  getCountries(search = '') {
    let result = this.countries.map(c => ({
      ...c,
      isSaved: this.savedCountries.has(c.code)
    }));
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.code.toLowerCase().includes(q) || 
        c.capital.toLowerCase().includes(q)
      );
    }
    return result;
  }

  getCountryByCode(code) {
    if (!code) return null;
    const country = this.countries.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (!country) return null;
    return {
      ...country,
      isSaved: this.savedCountries.has(country.code)
    };
  }

  toggleSavedCountry(code) {
    const upperCode = code.toUpperCase();
    if (this.savedCountries.has(upperCode)) {
      this.savedCountries.delete(upperCode);
    } else {
      this.savedCountries.add(upperCode);
    }
    return {
      code: upperCode,
      isSaved: this.savedCountries.has(upperCode)
    };
  }

  getSavedCountries() {
    return this.countries
      .filter(c => this.savedCountries.has(c.code))
      .map(c => ({ ...c, isSaved: true }));
  }

  // --- FORUM METHODS ---
  getForumCategories() {
    return this.forumCategories;
  }

  getForumDiscussions(category = null, search = '') {
    let result = [...this.discussions];
    if (category && category.toLowerCase() !== 'all') {
      result = result.filter(d => 
        d.category.toLowerCase() === category.toLowerCase() ||
        d.categoryId.toLowerCase() === category.toLowerCase()
      );
    }
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.content.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getForumDiscussionById(id) {
    return this.discussions.find(d => d.id === id) || null;
  }

  createForumDiscussion(userId, { category, title, currentSituation, feelings, biggestChallenge, content }) {
    const user = this.findUserById(userId);
    const categoryObj = this.forumCategories.find(c => c.name.toLowerCase() === (category || '').toLowerCase() || c.id === category) || this.forumCategories[0];
    
    const newDiscussion = {
      id: 'disc_' + Date.now(),
      category: categoryObj.name,
      categoryId: categoryObj.id,
      title: title || 'New Circle Discussion',
      content: content || currentSituation || 'Discussion thread',
      author: user?.profile?.fullName || user?.email || 'Anonymous Member',
      authorHouse: user?.joinedHouse?.name || 'House of Arthur',
      authorAvatar: user?.profile?.profilePictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      currentSituation: currentSituation || '',
      feelings: Array.isArray(feelings) ? feelings : [feelings].filter(Boolean),
      biggestChallenge: biggestChallenge || '',
      participantsCount: 1,
      repliesCount: 0,
      createdAt: new Date().toISOString(),
      replies: []
    };

    this.discussions.unshift(newDiscussion);
    this.saveData();
    return newDiscussion;
  }

  addDiscussionReply(userId, discussionId, { content, outcome, lessonLearned }) {
    const discussion = this.getForumDiscussionById(discussionId);
    if (!discussion) return null;

    const user = this.findUserById(userId);
    const newReply = {
      id: 'rep_' + Date.now(),
      author: user?.profile?.fullName || user?.email || 'Circle Member',
      authorHouse: user?.joinedHouse?.name || 'Gentleman Member',
      authorAvatar: user?.profile?.profilePictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      content: content || 'Shared experience reply.',
      outcome: outcome || 'Fostered resilience and clarity.',
      lessonLearned: lessonLearned || 'Sharing experiences empowers growth.',
      createdAt: new Date().toISOString()
    };

    discussion.replies.push(newReply);
    discussion.repliesCount += 1;
    discussion.participantsCount += 1;
    this.saveData();
    return newReply;
  }

  getForumNotifications() {
    return this.notifications;
  }

  // --- MULTILEVEL FEED METHODS ---
  getFeedsByLevel(level = 'all', houseId = null, search = '') {
    let result = [...this.feeds];
    
    if (level && level.toLowerCase() !== 'all') {
      result = result.filter(f => f.level === level.toLowerCase() || (f.level === undefined && level.toLowerCase() === 'global'));
    }
    
    if (houseId && houseId.toLowerCase() !== 'all') {
      result = result.filter(f => (f.houseId || '').toLowerCase() === houseId.toLowerCase());
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(f => 
        f.title.toLowerCase().includes(q) || 
        f.content.toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  rsvpFeedPost(userId, postId) {
    const post = this.feeds.find(f => f.id === postId);
    if (!post) return null;

    const rsvpKey = `${userId}_${postId}`;
    if (this.userRsvps.has(rsvpKey)) {
      this.userRsvps.delete(rsvpKey);
      post.rsvpCount = Math.max(0, (post.rsvpCount || 1) - 1);
      post.isRsvped = false;
    } else {
      this.userRsvps.add(rsvpKey);
      post.rsvpCount = (post.rsvpCount || 0) + 1;
      post.isRsvped = true;
    }
    this.saveData();
    return post;
  }

  // --- CITY GUIDE METHODS ---
  getCityCategories() {
    return this.cityCategories;
  }

  getCityPlaces(city = 'London', categoryId = null, search = '') {
    let result = [...this.cityPlaces];

    if (city && city.toLowerCase() !== 'all') {
      result = result.filter(p => p.city.toLowerCase() === city.toLowerCase());
    }

    if (categoryId && categoryId.toLowerCase() !== 'all') {
      result = result.filter(p => 
        p.categoryId.toLowerCase() === categoryId.toLowerCase() ||
        p.category.toLowerCase() === categoryId.toLowerCase()
      );
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
      );
    }

    return result;
  }

  getCityPlaceById(id) {
    return this.cityPlaces.find(p => p.id === id) || null;
  }

  bookCityPlace(userId, placeId, { date, partySize, specialNotes }) {
    const place = this.getCityPlaceById(placeId);
    if (!place) return null;

    const user = this.findUserById(userId);
    const booking = {
      id: 'book_' + Date.now(),
      placeId,
      placeName: place.name,
      city: place.city,
      userId,
      userName: user?.profile?.fullName || user?.email || 'Gentleman Member',
      userPhone: user?.profile?.phoneNumber || '',
      date: date || new Date().toISOString(),
      partySize: partySize || 2,
      specialNotes: specialNotes || 'VIP Concierge booking requested via Butler App',
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    this.placeBookings.push(booking);
    this.saveData();
    return booking;
  }

  // --- Butler Chat History & Conversations ---

  createConversation(userId = 'guest', persona = 'eaton', title = 'New Inquiry') {
    const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const conversation = {
      id,
      userId,
      persona,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    this.conversations.set(id, conversation);
    this.saveData();
    return conversation;
  }

  getUserConversations(userId) {
    if (!userId) return [];
    return Array.from(this.conversations.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  getConversation(conversationId, userId = null) {
    const conv = this.conversations.get(conversationId);
    if (!conv) return null;
    if (userId && conv.userId !== userId && conv.userId !== 'guest') {
      return null;
    }
    return conv;
  }

  addMessageToConversation(conversationId, { role, content, model, concierge, metrics }) {
    let conv = this.conversations.get(conversationId);
    if (!conv) return null;

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const message = {
      id: msgId,
      role,
      content,
      model: model || 'qwen2.5:0.5b',
      concierge: concierge || null,
      timestamp: new Date().toISOString()
    };

    conv.messages.push(message);
    conv.updatedAt = new Date().toISOString();

    // Auto-update conversation title from first user query if still generic
    if (conv.title === 'New Inquiry' || conv.title === 'New Conversation') {
      if (role === 'user' && content) {
        conv.title = content.length > 35 ? content.substring(0, 32) + '...' : content;
      }
    }

    this.saveData();
    return message;
  }

  deleteConversation(conversationId, userId = null) {
    const conv = this.getConversation(conversationId, userId);
    if (!conv) return false;
    this.conversations.delete(conversationId);
    this.saveData();
    return true;
  }

  clearConversationMessages(conversationId, userId = null) {
    const conv = this.getConversation(conversationId, userId);
    if (!conv) return false;
    conv.messages = [];
    conv.updatedAt = new Date().toISOString();
    this.saveData();
    return true;
  }
}

module.exports = new DatabaseStore();
