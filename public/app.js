// State Management
let state = {
  token: localStorage.getItem('butler_jwt') || null,
  user: null,
  hobbiesList: [],
  selectedHobbies: ['Arts and Culture', 'Sports', 'Lifestyle'],
  selectedHouseId: 'percival',
  recommendedHouse: null,
  houses: [],
  activeNavTab: 'feed',
  worldCountries: [],
  savedCountries: [],
  selectedCountryCode: null,
  forumCategories: [],
  forumDiscussions: [],
  selectedDiscussion: null,
  selectedFeelings: []
};

// DOM Content Loaded Initializer
document.addEventListener('DOMContentLoaded', async () => {
  await fetchInitialData();
  checkAuthSession();
});

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  if (toast) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 4500);
  }
}

function showScreen(screenId) {
  const screens = ['screenAuth', 'screenProfile', 'screenHobbies', 'screenHouses', 'screenFeed', 'screenWorldGuide', 'screenForum', 'screenShareExperience'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === screenId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  // Toggle Bottom Navigation visibility (only show when authenticated/in main screens)
  const nav = document.getElementById('bottomNavBar');
  if (nav) {
    if (['screenFeed', 'screenWorldGuide', 'screenForum', 'screenShareExperience'].includes(screenId)) {
      nav.style.display = 'flex';
    } else {
      nav.style.display = 'none';
    }
  }
}

function switchNavTab(tabName) {
  state.activeNavTab = tabName;
  const tabs = ['navFeed', 'navForum', 'navWorld', 'navProfile'];
  tabs.forEach(t => {
    const el = document.getElementById(t);
    if (el) el.classList.remove('active');
  });

  if (tabName === 'feed') {
    document.getElementById('navFeed')?.classList.add('active');
    loadFeed();
    showScreen('screenFeed');
  } else if (tabName === 'forum') {
    document.getElementById('navForum')?.classList.add('active');
    loadForumCategories();
    loadForumDiscussions();
    showScreen('screenForum');
  } else if (tabName === 'world') {
    document.getElementById('navWorld')?.classList.add('active');
    loadWorldGuide();
    showScreen('screenWorldGuide');
  } else if (tabName === 'profile') {
    document.getElementById('navProfile')?.classList.add('active');
    showScreen('screenProfile');
  }
}

// Initial API Data Fetching
async function fetchInitialData() {
  try {
    const [hobbiesRes, housesRes] = await Promise.all([
      fetch('/api/hobbies').then(r => r.json()),
      fetch('/api/houses').then(r => r.json())
    ]);

    if (hobbiesRes.success) {
      state.hobbiesList = hobbiesRes.hobbies;
      renderHobbies();
    }
    if (housesRes.success) {
      state.houses = housesRes.houses;
    }
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }
}

async function checkAuthSession() {
  if (!state.token) {
    showScreen('screenAuth');
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    }).then(r => r.json());

    if (res.success && res.user) {
      state.user = res.user;
      if (res.user.profile?.emailAddress) {
        document.getElementById('profEmail').value = res.user.profile.emailAddress;
      }
      
      if (document.getElementById('forumUserName')) {
        document.getElementById('forumUserName').textContent = res.user.profile?.fullName || res.user.email.split('@')[0];
      }
      if (document.getElementById('butlerUserName')) {
        document.getElementById('butlerUserName').textContent = res.user.profile?.preferredTitle || 'Sir';
      }

      // Determine stage
      if (!res.user.profile || !res.user.profile.fullName) {
        showScreen('screenProfile');
      } else if (!res.user.hobbies || res.user.hobbies.length === 0) {
        showScreen('screenHobbies');
      } else if (!res.user.joinedHouse) {
        await loadHouseRecommendations();
        showScreen('screenHouses');
      } else {
        switchNavTab('feed');
      }
    } else {
      localStorage.removeItem('butler_jwt');
      state.token = null;
      showScreen('screenAuth');
    }
  } catch (err) {
    showScreen('screenAuth');
  }
}

// --- AUTHENTICATION & RESEND OTP HANDLERS ---
let isLoginView = false;
function toggleLoginMode() {
  isLoginView = !isLoginView;
  const regBtn = document.querySelector('#formRegister button[type="submit"]');
  const heading = document.querySelector('#screenAuth .screen-heading');
  const boxVerify = document.getElementById('boxVerification');

  if (isLoginView) {
    heading.textContent = 'ACCOUNT LOGIN';
    regBtn.textContent = 'Login to Account';
    boxVerify.classList.add('hidden');
  } else {
    heading.textContent = 'CREATE YOUR ACCOUNT';
    regBtn.textContent = 'Create Account';
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  if (isLoginView) {
    // Login
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }).then(r => r.json());

      if (res.success) {
        state.token = res.token;
        state.user = res.user;
        localStorage.setItem('butler_jwt', res.token);
        showToast('Logged in successfully!');
        checkAuthSession();
      } else {
        showToast(res.error || 'Invalid credentials');
      }
    } catch (err) {
      showToast('Network error during login');
    }
    return;
  }

  // Register
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());

    if (res.success) {
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('butler_jwt', res.token);

      const boxVerify = document.getElementById('boxVerification');
      boxVerify.classList.remove('hidden');

      if (res.verificationCode) {
        document.getElementById('verifyCode').value = res.verificationCode;
      }

      showToast(res.message || 'Account created! OTP sent via Resend API.');
    } else {
      showToast(res.error || 'Registration failed');
    }
  } catch (err) {
    showToast('Network error during registration');
  }
}

async function handleVerifyEmail(event) {
  event.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const code = document.getElementById('verifyCode').value.trim();

  try {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    }).then(r => r.json());

    if (res.success) {
      showToast('Email verified successfully!');
      if (res.token) {
        state.token = res.token;
        localStorage.setItem('butler_jwt', res.token);
      }
      document.getElementById('profEmail').value = email;
      showScreen('screenProfile');
    } else {
      showToast(res.error || 'Verification failed');
    }
  } catch (err) {
    showToast('Network error during verification');
  }
}

async function handleResendOtp() {
  const email = document.getElementById('regEmail').value.trim();
  if (!email) {
    showToast('Please enter your email address first');
    return;
  }

  try {
    showToast('Dispatching OTP via Resend...');
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).then(r => r.json());

    if (res.success) {
      if (res.verificationCode) {
        document.getElementById('verifyCode').value = res.verificationCode;
      }
      showToast('📧 Fresh OTP code sent to your email via Resend!');
    } else {
      showToast(res.error || 'Failed to resend OTP');
    }
  } catch (err) {
    showToast('Network error triggering Resend OTP');
  }
}

// --- PROFILE HANDLERS ---
function handleAvatarSelected(event) {
  const file = event.target.files[0];
  if (file) {
    document.getElementById('fileNameDisplay').textContent = file.name;
  }
}

async function handleSaveProfile(event) {
  event.preventDefault();
  const title = document.getElementById('profTitle').value;
  const fullName = document.getElementById('profFullName').value.trim();
  const dateOfBirth = document.getElementById('profDOB').value;
  const phoneCode = document.getElementById('profCountryCode').value;
  const phone = document.getElementById('profPhone').value.trim();
  const country = document.getElementById('profCountry').value;
  const regionalState = document.getElementById('profState').value.trim();
  const city = document.getElementById('profCity').value.trim();
  const postcode = document.getElementById('profPostcode').value.trim();

  if (!fullName) {
    showToast('Full name is required');
    return;
  }

  const profileData = {
    preferredTitle: title,
    fullName,
    dateOfBirth,
    phoneNumber: `${phoneCode} ${phone}`,
    phoneCountryCode: phoneCode,
    country,
    regionalState,
    city,
    postcode,
    profilePictureUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(profileData)
    }).then(r => r.json());

    if (res.success) {
      state.user = res.user;
      showToast('Profile updated!');
      showScreen('screenHobbies');
    } else {
      showToast(res.error || 'Failed to update profile');
    }
  } catch (err) {
    showToast('Network error while saving profile');
  }
}

// --- HOBBIES & HOUSE HANDLERS ---
function renderHobbies() {
  const container = document.getElementById('hobbyContainer');
  if (!container) return;

  container.innerHTML = state.hobbiesList.map(h => {
    const isSelected = state.selectedHobbies.includes(h.name);
    return `
      <div class="hobby-pill ${isSelected ? 'selected' : ''}" onclick="toggleHobby('${h.name}')">
        <span>${isSelected ? '✓' : '+'}</span> ${h.name}
      </div>
    `;
  }).join('');
}

function toggleHobby(hobbyName) {
  if (state.selectedHobbies.includes(hobbyName)) {
    state.selectedHobbies = state.selectedHobbies.filter(h => h !== hobbyName);
  } else {
    state.selectedHobbies.push(hobbyName);
  }
  renderHobbies();
}

async function handleSaveHobbies() {
  if (state.selectedHobbies.length === 0) {
    showToast('Please select at least 1 hobby');
    return;
  }

  try {
    const res = await fetch('/api/hobbies/select', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ hobbies: state.selectedHobbies })
    }).then(r => r.json());

    if (res.success) {
      state.recommendedHouse = res.recommendedHouse;
      state.selectedHouseId = res.recommendedHouse.id;
      renderHouses();
      showScreen('screenHouses');
    } else {
      showToast(res.error || 'Failed to save hobbies');
    }
  } catch (err) {
    showToast('Network error while saving hobbies');
  }
}

async function loadHouseRecommendations() {
  renderHouses();
}

function renderHouses() {
  const banner = document.getElementById('recommendationBanner');
  const grid = document.getElementById('housesGrid');

  if (state.recommendedHouse && banner) {
    banner.textContent = `Based On Your Selected Hobbies, We Recommend House ${state.recommendedHouse.name}. The House Best Matches Your Interests And Traits.`;
  }

  if (grid && state.houses) {
    grid.innerHTML = state.houses.map(h => {
      const isSelected = state.selectedHouseId === h.id;
      const isRec = state.recommendedHouse && state.recommendedHouse.id === h.id;
      return `
        <div class="house-card ${isSelected ? 'selected' : ''}" onclick="selectHouse('${h.id}')">
          ${isRec ? '<span class="rec-badge">Recommended</span>' : ''}
          <div class="house-title">HOUSE ${h.name.toUpperCase()}</div>
          <div class="house-motto">"${h.motto}"</div>
          <div style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.3;">${h.description}</div>
        </div>
      `;
    }).join('');
  }
}

function selectHouse(id) {
  state.selectedHouseId = id;
  renderHouses();
}

async function handleJoinHouse() {
  try {
    const res = await fetch('/api/houses/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ houseId: state.selectedHouseId })
    }).then(r => r.json());

    if (res.success) {
      state.user = res.user;
      showToast(`Welcome to House ${res.house.name}!`);
      switchNavTab('feed');
    } else {
      showToast(res.error || 'Could not join House');
    }
  } catch (err) {
    showToast('Network error while joining House');
  }
}

// --- ACTIVITY FEED HANDLERS ---
async function loadFeed() {
  try {
    const res = await fetch('/api/feed').then(r => r.json());
    if (res.success) {
      renderFeed(res.feeds);
    }
    if (state.user) {
      const name = state.user.profile?.fullName || state.user.email;
      const title = state.user.profile?.preferredTitle || 'Gentleman';
      document.getElementById('feedUserName').textContent = `${title} ${name}`;
      document.getElementById('feedUserHouse').textContent = `House ${state.user.joinedHouse?.name || 'Percival'} Member`;
    }
  } catch (err) {
    console.error('Failed to load feed:', err);
  }
}

function renderFeed(feeds) {
  const container = document.getElementById('feedPostsContainer');
  if (!container) return;

  container.innerHTML = feeds.map(post => `
    <div class="feed-item">
      <div class="feed-author-bar">
        <img src="${post.authorAvatar}" class="feed-author-avatar" alt="${post.author}">
        <div>
          <div style="font-size: 0.85rem; font-weight: 700;">${post.author}</div>
          <div style="font-size: 0.72rem; color: var(--primary-accent);">House ${post.authorHouse}</div>
        </div>
      </div>
      <div class="feed-post-title">${post.title}</div>
      <div class="feed-post-body">${post.content}</div>
      <div class="feed-actions">
        <button class="like-btn" onclick="handleLikePost('${post.id}')">
          ❤️ ${post.likes} Likes
        </button>
        <span>💬 ${post.commentsCount} Comments</span>
      </div>
    </div>
  `).join('');
}

async function handleCreatePost() {
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();

  if (!title || !content) {
    showToast('Title and content are required');
    return;
  }

  try {
    const res = await fetch('/api/feed/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ title, content, category: 'General' })
    }).then(r => r.json());

    if (res.success) {
      showToast('Activity post published!');
      document.getElementById('postTitle').value = '';
      document.getElementById('postContent').value = '';
      loadFeed();
    }
  } catch (err) {
    showToast('Network error while publishing');
  }
}

async function handleLikePost(postId) {
  try {
    const res = await fetch(`/api/feed/posts/${postId}/like`, { method: 'POST' }).then(r => r.json());
    if (res.success) loadFeed();
  } catch (err) {}
}

// --- WORLD GUIDE HANDLERS (Matching Image 1) ---
async function loadWorldGuide(search = '') {
  try {
    const url = search ? `/api/world-guide/countries?search=${encodeURIComponent(search)}` : '/api/world-guide/countries';
    const res = await fetch(url).then(r => r.json());

    if (res.success) {
      state.worldCountries = res.countries;
      state.savedCountries = res.savedCountries;
      renderWorldGuide();
    }
  } catch (err) {
    console.error('Failed to load world guide:', err);
  }
}

function handleWorldSearch(event) {
  const query = event.target.value;
  loadWorldGuide(query);
}

function renderWorldGuide() {
  const container = document.getElementById('worldCountriesContainer');
  const savedContainer = document.getElementById('worldSavedContainer');

  if (savedContainer) {
    if (!state.savedCountries || state.savedCountries.length === 0) {
      savedContainer.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted);">No saved countries yet. Click "Save" on any country card.</span>`;
    } else {
      savedContainer.innerHTML = state.savedCountries.map(c => `
        <button class="btn-country-save saved" onclick="openCountryDetailModal('${c.code}')" style="flex:none; padding:4px 10px; font-size:0.75rem;">
          ${c.flag} ${c.code} (${c.name})
        </button>
      `).join('');
    }
  }

  if (container) {
    container.innerHTML = state.worldCountries.map(c => `
      <div class="country-card">
        <div class="country-card-header">
          <div class="country-flag-title">
            <span class="country-flag">${c.flag}</span>
            <div>
              <div class="country-name">${c.name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${c.capital} · ${c.timezone.split('/')[0]}</div>
            </div>
          </div>
          <span class="country-code-pill">${c.code}</span>
        </div>

        <div class="country-details-grid">
          <div class="country-detail-item">Currency: <strong>${c.currency}</strong></div>
          <div class="country-detail-item">Dialing: <strong>${c.dialingCode}</strong></div>
          <div class="country-detail-item" style="grid-column: span 2;">
            Emergency: <strong style="color: var(--primary-accent);">${c.emergencyNumbers.general}</strong>
          </div>
        </div>

        <div class="country-actions">
          <button type="button" class="btn-country-save ${c.isSaved ? 'saved' : ''}" onclick="toggleSaveCountry('${c.code}')">
            ${c.isSaved ? '★ Saved' : '☆ Save'}
          </button>
          <button type="button" class="btn-country-view" onclick="openCountryDetailModal('${c.code}')">
            View Guide
          </button>
        </div>
      </div>
    `).join('');
  }
}

async function toggleSaveCountry(code) {
  try {
    const res = await fetch(`/api/world-guide/saved/${code}`, { method: 'POST' }).then(r => r.json());
    if (res.success) {
      showToast(res.message);
      loadWorldGuide();
    }
  } catch (err) {
    showToast('Failed to save country');
  }
}

async function openCountryDetailModal(code) {
  try {
    const res = await fetch(`/api/world-guide/countries/${code}`).then(r => r.json());
    if (!res.success || !res.country) {
      showToast('Country guide details not found');
      return;
    }

    const c = res.country;
    const modalContent = document.getElementById('countryModalContent');
    if (modalContent) {
      modalContent.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <span style="font-size: 2.4rem;">${c.flag}</span>
          <div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main); margin:0;">${c.name} (${c.code})</h3>
            <span style="font-size: 0.78rem; color: var(--primary-accent);">${c.capital} · Dialing Code ${c.dialingCode}</span>
          </div>
        </div>

        <div class="country-details-grid" style="margin-bottom: 16px;">
          <div class="country-detail-item">Currency: <strong>${c.currency}</strong></div>
          <div class="country-detail-item">Timezone: <strong>${c.timezone}</strong></div>
          <div class="country-detail-item">Languages: <strong>${c.languages.join(', ')}</strong></div>
          <div class="country-detail-item">Plug Types: <strong>${c.plugTypes.join(', ')}</strong></div>
        </div>

        <div style="margin-bottom: 14px;">
          <h4 style="font-size: 0.85rem; color: var(--primary-accent); margin-bottom: 6px;">🚨 Emergency Lines</h4>
          <div style="background: #25201C; padding: 10px; border-radius: 8px; font-size: 0.78rem; color: var(--text-muted);">
            <div>Police: <strong>${c.emergencyNumbers.police}</strong></div>
            <div>Ambulance: <strong>${c.emergencyNumbers.ambulance}</strong></div>
            <div>Fire: <strong>${c.emergencyNumbers.fire}</strong></div>
            <div style="margin-top: 4px; font-style: italic; color: #D1C9C3;">${c.emergencyNumbers.healthcareNotes}</div>
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <h4 style="font-size: 0.85rem; color: var(--primary-accent); margin-bottom: 6px;">🏥 Recommended Hospitals</h4>
          ${c.hospitals.map(h => `
            <div style="background: #25201C; padding: 8px 10px; border-radius: 8px; font-size: 0.78rem; margin-bottom: 6px;">
              <div style="font-weight: 700; color: var(--text-main);">${h.name} (${h.city})</div>
              <div style="color: var(--text-muted);">${h.address} · <a href="tel:${h.phone}" style="color: var(--primary-accent);">${h.phone}</a></div>
            </div>
          `).join('')}
        </div>

        <div style="margin-bottom: 14px;">
          <h4 style="font-size: 0.85rem; color: var(--primary-accent); margin-bottom: 6px;">🚖 Getting Around</h4>
          <div style="background: #25201C; padding: 10px; border-radius: 8px; font-size: 0.78rem; color: var(--text-muted);">
            <div>Ride Apps: <strong>${c.gettingAround.rideHailing.join(', ')}</strong></div>
            <div>Transit: <strong>${c.gettingAround.transitNotes}</strong></div>
            <div>Tipping: <strong>${c.gettingAround.tippingEtiquette}</strong></div>
          </div>
        </div>

        <div>
          <h4 style="font-size: 0.85rem; color: var(--primary-accent); margin-bottom: 6px;">💸 Money Transfer & FX</h4>
          <div style="background: #25201C; padding: 10px; border-radius: 8px; font-size: 0.78rem; color: var(--text-muted);">
            <div>Services: <strong>${c.moneyTransfer.recommendedServices.join(', ')}</strong></div>
            <div>FX Info: <strong>${c.moneyTransfer.exchangeRateInfo}</strong></div>
            <div>Notes: <strong>${c.moneyTransfer.notes}</strong></div>
          </div>
        </div>
      `;
    }

    const modal = document.getElementById('modalCountryDetail');
    if (modal) modal.classList.add('active');
  } catch (err) {
    showToast('Failed to open country guide');
  }
}

function closeCountryDetailModal() {
  document.getElementById('modalCountryDetail')?.classList.remove('active');
}

// --- FORUM HANDLERS (Matching Image 2) ---
async function loadForumCategories() {
  try {
    const res = await fetch('/api/forum/categories').then(r => r.json());
    if (res.success) {
      state.forumCategories = res.categories;
      renderForumCategories();
    }
  } catch (err) {
    console.error('Failed to load forum categories:', err);
  }
}

function renderForumCategories() {
  const container = document.getElementById('forumCategoriesContainer');
  if (!container) return;

  container.innerHTML = state.forumCategories.map(cat => `
    <div class="forum-cat-card" onclick="filterForumByCategory('${cat.name}')">
      <span class="forum-cat-icon">${cat.icon}</span>
      <span class="forum-cat-name">${cat.name}</span>
    </div>
  `).join('');
}

function filterForumByCategory(catName) {
  loadForumDiscussions(catName);
}

async function loadForumDiscussions(category = null, search = '') {
  try {
    let url = '/api/forum/discussions';
    const params = [];
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) url += '?' + params.join('&');

    const res = await fetch(url).then(r => r.json());
    if (res.success) {
      state.forumDiscussions = res.discussions;
      renderForumDiscussions();
    }
  } catch (err) {
    console.error('Failed to load discussions:', err);
  }
}

function handleForumSearch(event) {
  const query = event.target.value;
  loadForumDiscussions(null, query);
}

function renderForumDiscussions() {
  const container = document.getElementById('forumDiscussionsContainer');
  if (!container) return;

  container.innerHTML = state.forumDiscussions.map(disc => `
    <div class="discussion-card" onclick="openDiscussionDetail('${disc.id}')">
      <div class="discussion-header">
        <img src="${disc.authorAvatar}" class="discussion-author-avatar" alt="${disc.author}">
        <div>
          <div class="discussion-author-name">${disc.author}</div>
          <div class="discussion-meta">${disc.authorHouse} · ${disc.category}</div>
        </div>
      </div>
      <div class="discussion-title">${disc.title}</div>
      <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.35; margin-bottom: 6px;">${disc.content}</div>

      ${disc.feelings && disc.feelings.length > 0 ? `
        <div class="feelings-tags-container">
          ${disc.feelings.map(f => `<span class="feeling-tag-chip">${f}</span>`).join('')}
        </div>
      ` : ''}

      <div class="discussion-footer">
        <span>👥 ${disc.participantsCount} participants</span>
        <span>💬 ${disc.repliesCount} replies</span>
      </div>
    </div>
  `).join('');
}

// Modal step for Creating Discussion
function openNewDiscussionModal() {
  state.selectedFeelings = [];
  document.querySelectorAll('#feelingsTagPicker .feeling-tag-chip').forEach(el => el.classList.remove('selected'));
  document.getElementById('modalNewDiscussion')?.classList.add('active');
}

function closeNewDiscussionModal() {
  document.getElementById('modalNewDiscussion')?.classList.remove('active');
}

function toggleFeelingTag(el, tag) {
  if (state.selectedFeelings.includes(tag)) {
    state.selectedFeelings = state.selectedFeelings.filter(t => t !== tag);
    el.classList.remove('selected');
  } else {
    if (state.selectedFeelings.length >= 3) {
      showToast('Select up to 3 feelings');
      return;
    }
    state.selectedFeelings.push(tag);
    el.classList.add('selected');
  }
}

function proceedToBeforeJoinModal() {
  const title = document.getElementById('newDiscTitle').value.trim();
  const situation = document.getElementById('newDiscSituation').value.trim();

  if (!title || !situation) {
    showToast('Please enter a discussion title and current situation');
    return;
  }

  // Populate disclosure information
  if (state.user) {
    const name = state.user.profile?.fullName || state.user.email;
    const house = state.user.joinedHouse?.name || 'Percival';
    const city = state.user.profile?.city || 'London';

    document.getElementById('joinModalIdentity').textContent = name;
    document.getElementById('joinModalHouse').textContent = `House ${house}`;
    document.getElementById('joinModalCity').textContent = city;
  }

  closeNewDiscussionModal();
  document.getElementById('modalBeforeJoin')?.classList.add('active');
}

function closeBeforeJoinModal() {
  document.getElementById('modalBeforeJoin')?.classList.remove('active');
}

async function confirmPublishDiscussion() {
  const category = document.getElementById('newDiscCategory').value;
  const title = document.getElementById('newDiscTitle').value.trim();
  const currentSituation = document.getElementById('newDiscSituation').value.trim();
  const biggestChallenge = document.getElementById('newDiscChallenge').value.trim();

  try {
    const res = await fetch('/api/forum/discussions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        category,
        title,
        currentSituation,
        feelings: state.selectedFeelings,
        biggestChallenge
      })
    }).then(r => r.json());

    if (res.success) {
      closeBeforeJoinModal();
      showToast('Discussion circle created!');
      loadForumDiscussions();
    } else {
      showToast(res.error || 'Failed to create discussion');
    }
  } catch (err) {
    showToast('Network error creating discussion');
  }
}

async function openDiscussionDetail(id) {
  try {
    const res = await fetch(`/api/forum/discussions/${id}`).then(r => r.json());
    if (!res.success || !res.discussion) {
      showToast('Discussion not found');
      return;
    }

    state.selectedDiscussion = res.discussion;
    renderDiscussionDetail();
    showScreen('screenShareExperience');
  } catch (err) {
    showToast('Failed to load discussion thread');
  }
}

function openShareExperienceModal() {
  if (state.forumDiscussions.length > 0) {
    openDiscussionDetail(state.forumDiscussions[0].id);
  } else {
    showToast('No discussion threads available yet');
  }
}

function renderDiscussionDetail() {
  const disc = state.selectedDiscussion;
  const container = document.getElementById('discussionDetailContent');
  if (!container || !disc) return;

  container.innerHTML = `
    <div class="discussion-card">
      <div class="discussion-header">
        <img src="${disc.authorAvatar}" class="discussion-author-avatar" alt="${disc.author}">
        <div>
          <div class="discussion-author-name">${disc.author}</div>
          <div class="discussion-meta">${disc.authorHouse} · ${disc.category}</div>
        </div>
      </div>
      <h3 class="discussion-title">${disc.title}</h3>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:10px;">${disc.content}</p>

      ${disc.currentSituation ? `
        <div style="background:#181513; padding:10px; border-radius:8px; font-size:0.78rem; margin-bottom:8px;">
          <strong style="color:var(--primary-accent);">Current Situation:</strong> ${disc.currentSituation}
        </div>
      ` : ''}

      ${disc.biggestChallenge ? `
        <div style="background:#181513; padding:10px; border-radius:8px; font-size:0.78rem; margin-bottom:8px;">
          <strong style="color:var(--primary-accent);">Primary Blocker:</strong> ${disc.biggestChallenge}
        </div>
      ` : ''}

      ${disc.feelings && disc.feelings.length > 0 ? `
        <div class="feelings-tags-container">
          ${disc.feelings.map(f => `<span class="feeling-tag-chip">${f}</span>`).join('')}
        </div>
      ` : ''}
    </div>

    <div style="font-size:0.85rem; font-weight:800; color:var(--primary-accent); margin:16px 0 10px 0;">
      Member Experiences (${disc.replies ? disc.replies.length : 0})
    </div>

    ${disc.replies && disc.replies.length > 0 ? disc.replies.map(r => `
      <div style="background:#221D1A; border:1px solid var(--card-border); padding:12px; border-radius:12px; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          <img src="${r.authorAvatar}" style="width:24px; height:24px; border-radius:50%;" alt="${r.author}">
          <div style="font-size:0.8rem; font-weight:700;">${r.author} (${r.authorHouse})</div>
        </div>
        <div style="font-size:0.8rem; color:#D1C9C3; margin-bottom:6px;">${r.content}</div>
        <div style="font-size:0.74rem; color:var(--text-muted); background:#181513; padding:6px 10px; border-radius:6px;">
          <div>💡 <strong>Outcome:</strong> ${r.outcome}</div>
          <div>✨ <strong>Lesson Learned:</strong> ${r.lessonLearned}</div>
        </div>
      </div>
    `).join('') : '<div style="font-size:0.78rem; color:var(--text-muted);">No experiences shared yet. Be the first to reply below!</div>'}
  `;
}

async function handleSubmitReply() {
  if (!state.selectedDiscussion) return;

  const content = document.getElementById('replyContent').value.trim();
  const outcome = document.getElementById('replyOutcome').value.trim();
  const lessonLearned = document.getElementById('replyLesson').value.trim();

  if (!content) {
    showToast('Please describe your experience');
    return;
  }

  try {
    const res = await fetch(`/api/forum/discussions/${state.selectedDiscussion.id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ content, outcome, lessonLearned })
    }).then(r => r.json());

    if (res.success) {
      showToast('Experience reply shared with circle!');
      document.getElementById('replyContent').value = '';
      document.getElementById('replyOutcome').value = '';
      document.getElementById('replyLesson').value = '';
      openDiscussionDetail(state.selectedDiscussion.id);
    } else {
      showToast(res.error || 'Failed to submit reply');
    }
  } catch (err) {
    showToast('Network error submitting experience');
  }
}

// --- NOTIFICATIONS & BUTLER AI CONCIERGE DRAWER HANDLERS ---
async function openNotificationsModal() {
  try {
    const res = await fetch('/api/forum/notifications').then(r => r.json());
    if (res.success) {
      const container = document.getElementById('notificationsListContainer');
      if (container) {
        container.innerHTML = res.notifications.map(n => `
          <div style="background:#25201C; padding:10px 12px; border-radius:10px; border-left:3px solid var(--primary-accent); margin-bottom:8px;">
            <div style="display:flex; justify-between; align-items:center;">
              <strong style="font-size:0.82rem; color:var(--text-main);">${n.title}</strong>
              <span style="font-size:0.75rem; color:var(--text-muted); margin-left:auto;">${n.time}</span>
            </div>
            <div style="font-size:0.76rem; color:var(--text-muted); margin-top:2px;">${n.message}</div>
          </div>
        `).join('');
      }
    }
    document.getElementById('modalNotifications')?.classList.add('active');
  } catch (err) {
    showToast('Failed to load notifications');
  }
}

function closeNotificationsModal() {
  document.getElementById('modalNotifications')?.classList.remove('active');
}

function openButlerDrawer() {
  document.getElementById('drawerButler')?.classList.add('open');
}

function closeButlerDrawer() {
  document.getElementById('drawerButler')?.classList.remove('open');
}

function sendButlerPrompt(text) {
  document.getElementById('butlerInput').value = text;
  submitButlerQuery();
}

function submitButlerQuery() {
  const query = document.getElementById('butlerInput').value.trim();
  if (!query) return;

  showToast(`Butler AI: Processing request "${query}"...`);
  document.getElementById('butlerInput').value = '';
  setTimeout(() => {
    showToast(`Butler AI: I have reserved and curated options for "${query}". Check your notifications!`);
    closeButlerDrawer();
  }, 1200);
}
