require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const hobbiesRoutes = require('./routes/hobbies.routes');
const housesRoutes = require('./routes/houses.routes');
const feedRoutes = require('./routes/feed.routes');
const worldGuideRoutes = require('./routes/world_guide.routes');
const forumRoutes = require('./routes/forum.routes');
const cityGuideRoutes = require('./routes/city_guide.routes');
const setupSwagger = require('./swagger/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files and uploads
app.use(express.static(path.join(__dirname, '../public')));

// Mount Swagger Documentation
setupSwagger(app);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/hobbies', hobbiesRoutes);
app.use('/api/houses', housesRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/world-guide', worldGuideRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/city-guide', cityGuideRoutes);

// Root route fallback to frontend SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Butler App Server running on http://localhost:${PORT}`);
  console.log(` Swagger Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`=======================================================`);
});
