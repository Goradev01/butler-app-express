// State Management
let state = {
  token: localStorage.getItem('butler_jwt') || null,
  user: null,
  hobbiesList: [],
  selectedHobbies: ['Arts and Culture', 'Sports', 'Lifestyle'],
  selectedHouseId: 'percival',
  recommendedHouse: null,
  houses: []
};

// DOM Content Loaded Initializer
document.addEventListener('DOMContentLoaded', async () => {
  await fetchInitialData();
  checkAuthSession();
});

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

function showScreen(screenId) {
  const screens = ['screenAuth', 'screenProfile', 'screenHobbies', 'screenHouses', 'screenFeed'];
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
      
      // Determine appropriate onboarding stage
      if (!res.user.profile || !res.user.profile.fullName) {
        showScreen('screenProfile');
      } else if (!res.user.hobbies || res.user.hobbies.length === 0) {
        showScreen('screenHobbies');
      } else if (!res.user.joinedHouse) {
        await loadHouseRecommendations();
        showScreen('screenHouses');
      } else {
        loadFeed();
        showScreen('screenFeed');
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

// SCREEN 1: Authentication & Verification Handlers
async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());

    if (!res.success) {
      showToast(res.error || 'Registration failed');
      return;
    }

    state.token = res.token;
    localStorage.setItem('butler_jwt', res.token);
    document.getElementById('profEmail').value = email;

    // Show verification box
    document.getElementById('boxVerification').classList.remove('hidden');
    document.getElementById('verifyCode').value = res.verificationCode || '';
    showToast(`Account created! Demo Verification OTP Code is: ${res.verificationCode}`);
  } catch (err) {
    showToast('Network error during registration');
  }
}

async function handleVerifyEmail(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const code = document.getElementById('verifyCode').value.trim();

  try {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    }).then(r => r.json());

    if (!res.success) {
      showToast(res.error || 'Verification failed');
      return;
    }

    showToast('Email verified successfully!');
    showScreen('screenProfile');
  } catch (err) {
    showToast('Network error during verification');
  }
}

function toggleLoginMode() {
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(r => r.json()).then(res => {
    if (res.success) {
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('butler_jwt', res.token);
      showToast('Logged in successfully!');
      checkAuthSession();
    } else {
      showToast(res.error || 'Login failed');
    }
  });
}

// SCREEN 2: Complete Profile Handler
async function handleAvatarSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('fileNameDisplay').textContent = file.name;
  
  if (!state.token) return;

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` },
      body: formData
    }).then(r => r.json());

    if (res.success) {
      showToast('Profile picture uploaded successfully!');
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleSaveProfile(e) {
  e.preventDefault();

  const profileData = {
    preferredTitle: document.getElementById('profTitle').value,
    fullName: document.getElementById('profFullName').value,
    dateOfBirth: document.getElementById('profDOB').value,
    emailAddress: document.getElementById('regEmail').value || document.getElementById('profEmail').value,
    phoneNumber: document.getElementById('profPhone').value,
    phoneCountryCode: document.getElementById('profCountryCode').value,
    country: document.getElementById('profCountry').value,
    regionalState: document.getElementById('profState').value,
    city: document.getElementById('profCity').value,
    postcode: document.getElementById('profPostcode').value
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
      showToast('Profile saved successfully!');
      showScreen('screenHobbies');
    } else {
      showToast(res.error || 'Failed to update profile');
    }
  } catch (err) {
    showToast('Network error while saving profile');
  }
}

// SCREEN 3: Hobbies Selection Handler
function renderHobbies() {
  const container = document.getElementById('hobbyContainer');
  if (!container) return;

  container.innerHTML = state.hobbiesList.map(h => {
    const isSelected = state.selectedHobbies.includes(h.name);
    return `
      <div class="hobby-card ${isSelected ? 'selected' : ''}" onclick="toggleHobby('${h.name}')">
        <span>${h.name}</span>
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
      await renderHouses();
      showScreen('screenHouses');
    } else {
      showToast(res.error || 'Failed to save hobbies');
    }
  } catch (err) {
    showToast('Network error while saving hobbies');
  }
}

// SCREEN 4: 12 Houses of Gentlemen Handler
async function loadHouseRecommendations() {
  try {
    const res = await fetch('/api/houses/recommendation', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    }).then(r => r.json());

    if (res.success) {
      state.recommendedHouse = res.recommendedHouse;
      state.selectedHouseId = res.recommendedHouse.id;
    }
    renderHouses();
  } catch (err) {
    renderHouses();
  }
}

function renderHouses() {
  const grid = document.getElementById('housesGrid');
  const banner = document.getElementById('recommendationBanner');
  if (!grid) return;

  const rec = state.recommendedHouse || { id: 'percival', name: 'Percival' };

  if (banner) {
    banner.textContent = `Based On Your Selected Hobbies, We Recommend House ${rec.name}. The House Best Matches Your Interests And Traits.`;
  }

  grid.innerHTML = state.houses.map(house => {
    const isRec = house.id === rec.id;
    const isSelected = house.id === state.selectedHouseId;
    return `
      <div class="house-card ${isSelected ? 'selected' : ''}" onclick="selectHouse('${house.id}')">
        ${isRec ? '<span class="recommended-pill">Recommended</span>' : ''}
        <div class="house-name">${house.name}</div>
        <div class="house-motto">${house.motto}</div>
      </div>
    `;
  }).join('');
}

function selectHouse(houseId) {
  state.selectedHouseId = houseId;
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
      showToast(`Welcome to House ${res.joinedHouse.name}!`);
      loadFeed();
      showScreen('screenFeed');
    } else {
      showToast(res.error || 'Could not join House');
    }
  } catch (err) {
    showToast('Network error while joining House');
  }
}

// SCREEN 5: Activity Feed Handlers
async function loadFeed() {
  try {
    const res = await fetch('/api/feed').then(r => r.json());
    if (res.success) {
      renderFeed(res.feeds);
    }

    // Update Header info
    if (state.user) {
      const name = state.user.profile?.fullName || state.user.email;
      const title = state.user.profile?.preferredTitle || 'Gentleman';
      document.getElementById('feedUserName').textContent = `${title} ${name}`;
      document.getElementById('feedUserHouse').textContent = `House ${state.user.joinedHouse?.name || 'Percival'} Member`;
      if (state.user.profile?.profilePictureUrl) {
        document.getElementById('feedUserAvatar').src = state.user.profile.profilePictureUrl;
      }
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
    showToast('Title and content are required to publish');
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
    } else {
      showToast(res.error || 'Failed to publish post');
    }
  } catch (err) {
    showToast('Network error while publishing post');
  }
}

async function handleLikePost(postId) {
  try {
    const res = await fetch(`/api/feed/posts/${postId}/like`, { method: 'POST' }).then(r => r.json());
    if (res.success) {
      loadFeed();
    }
  } catch (err) {
    console.error(err);
  }
}
