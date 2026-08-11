const express = require('express');
const router = express.Router();
const db = require('../db/store');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @openapi
 * /api/hobbies:
 *   get:
 *     summary: List all available hobby categories
 *     tags: [Hobbies]
 *     responses:
 *       200:
 *         description: List of standard hobbies for feed personalization.
 */
router.get('/', (req, res) => {
  return res.json({
    success: true,
    hobbies: db.hobbies
  });
});

/**
 * @openapi
 * /api/hobbies/select:
 *   post:
 *     summary: Save user chosen hobbies
 *     tags: [Hobbies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hobbies]
 *             properties:
 *               hobbies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Arts and Culture", "Sports", "Lifestyle", "Adventure & Exploration"]
 *     responses:
 *       200:
 *         description: Hobbies saved successfully. Returns recommended House.
 */
router.post('/select', authenticateToken, (req, res) => {
  const { hobbies } = req.body;
  if (!Array.isArray(hobbies)) {
    return res.status(400).json({ success: false, error: 'Hobbies must be an array of strings.' });
  }

  const updatedUser = db.setUserHobbies(req.user.id, hobbies);
  const recommendedHouse = db.recommendHouse(hobbies);

  return res.json({
    success: true,
    message: 'Hobbies updated successfully!',
    hobbies: updatedUser.hobbies,
    recommendedHouse
  });
});

module.exports = router;
