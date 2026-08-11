const express = require('express');
const router = express.Router();
const db = require('../db/store');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @openapi
 * /api/houses:
 *   get:
 *     summary: List all 12 Houses of the Gentlemen with mottos and descriptions
 *     tags: [12 Houses of Gentlemen]
 *     responses:
 *       200:
 *         description: List of the 12 Houses.
 */
router.get('/', (req, res) => {
  return res.json({
    success: true,
    houses: db.houses
  });
});

/**
 * @openapi
 * /api/houses/recommendation:
 *   get:
 *     summary: Get calculated house recommendation for current user based on hobbies
 *     tags: [12 Houses of Gentlemen]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended House object.
 */
router.get('/recommendation', authenticateToken, (req, res) => {
  const hobbies = req.user.hobbies || [];
  const recommended = db.recommendHouse(hobbies);
  return res.json({
    success: true,
    recommendedHouse: recommended
  });
});

/**
 * @openapi
 * /api/houses/join:
 *   post:
 *     summary: Join a specific House of the Gentlemen
 *     tags: [12 Houses of Gentlemen]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [houseId]
 *             properties:
 *               houseId:
 *                 type: string
 *                 example: percival
 *     responses:
 *       200:
 *         description: Joined House successfully.
 */
router.post('/join', authenticateToken, (req, res) => {
  const { houseId } = req.body;
  if (!houseId) {
    return res.status(400).json({ success: false, error: 'House ID is required.' });
  }

  const updatedUser = db.setUserHouse(req.user.id, houseId);
  if (!updatedUser) {
    return res.status(404).json({ success: false, error: 'Invalid house specified.' });
  }

  return res.json({
    success: true,
    message: `Congratulations! You have joined House ${updatedUser.joinedHouse.name}`,
    joinedHouse: updatedUser.joinedHouse,
    user: updatedUser
  });
});

module.exports = router;
