const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db/store');
const { authenticateToken } = require('../middleware/auth.middleware');

// Configure multer storage for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * @openapi
 * /api/profile:
 *   put:
 *     summary: Complete or update user personal profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferredTitle:
 *                 type: string
 *                 example: Lord
 *               fullName:
 *                 type: string
 *                 example: Alexander Wright
 *               dateOfBirth:
 *                 type: string
 *                 example: "1994-05-12"
 *               emailAddress:
 *                 type: string
 *                 example: gentleman@butler.app
 *               phoneNumber:
 *                 type: string
 *                 example: "5550192"
 *               phoneCountryCode:
 *                 type: string
 *                 example: "+1"
 *               country:
 *                 type: string
 *                 example: United Kingdom
 *               regionalState:
 *                 type: string
 *                 example: Greater London
 *               city:
 *                 type: string
 *                 example: London
 *               postcode:
 *                 type: string
 *                 example: SW1A 1AA
 *               profilePictureUrl:
 *                 type: string
 *                 example: "/uploads/avatar.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 */
router.put('/', authenticateToken, (req, res) => {
  const updatedUser = db.updateProfile(req.user.id, req.body);
  if (!updatedUser) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  return res.json({
    success: true,
    message: 'Profile completed successfully!',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      profile: updatedUser.profile
    }
  });
});

/**
 * @openapi
 * /api/profile/avatar:
 *   post:
 *     summary: Upload profile picture file
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully.
 */
router.post('/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  const updatedUser = db.updateProfile(req.user.id, {
    ...req.user.profile,
    profilePictureUrl: fileUrl
  });

  return res.json({
    success: true,
    message: 'Profile image uploaded successfully',
    profilePictureUrl: fileUrl,
    user: updatedUser
  });
});

/**
 * @openapi
 * /api/profile:
 *   get:
 *     summary: Fetch complete user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile details.
 */
router.get('/', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    profile: req.user.profile || {}
  });
});

module.exports = router;
