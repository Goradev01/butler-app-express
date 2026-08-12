const express = require('express');
const router = express.Router();
const db = require('../db/store');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @openapi
 * /api/city-guide/categories:
 *   get:
 *     summary: Retrieve City Guide categories (12 categories)
 *     tags: [City Guide]
 *     responses:
 *       200:
 *         description: List of categories (Food & Drink, Culture, Lodging, Services, etc.)
 */
router.get('/categories', (req, res) => {
  const categories = db.getCityCategories();
  return res.json({
    success: true,
    categories
  });
});

/**
 * @openapi
 * /api/city-guide/places:
 *   get:
 *     summary: Retrieve city guide places by city, category, or search
 *     tags: [City Guide]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         example: London
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         example: food_drink
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of local city places with map coordinates and ratings
 */
router.get('/places', (req, res) => {
  const { city, category, search } = req.query;
  const places = db.getCityPlaces(city || 'London', category, search);
  return res.json({
    success: true,
    city: city || 'London',
    places
  });
});

/**
 * @openapi
 * /api/city-guide/places/{id}:
 *   get:
 *     summary: Get details for a specific city place
 *     tags: [City Guide]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed place object
 */
router.get('/places/:id', (req, res) => {
  const place = db.getCityPlaceById(req.params.id);
  if (!place) {
    return res.status(404).json({ success: false, error: 'City place not found' });
  }
  return res.json({
    success: true,
    place
  });
});

/**
 * @openapi
 * /api/city-guide/places/{id}/book:
 *   post:
 *     summary: Book or request VIP concierge reservation at a city venue
 *     tags: [City Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 example: 2026-08-20T19:30:00Z
 *               partySize:
 *                 type: integer
 *                 example: 2
 *               specialNotes:
 *                 type: string
 *                 example: Quiet table near window
 *     responses:
 *       200:
 *         description: Reservation request confirmed.
 */
router.post('/places/:id/book', authenticateToken, (req, res) => {
  const { date, partySize, specialNotes } = req.body || {};
  const booking = db.bookCityPlace(req.user.id, req.params.id, { date, partySize, specialNotes });
  if (!booking) {
    return res.status(404).json({ success: false, error: 'Place not found' });
  }
  return res.json({
    success: true,
    message: 'VIP reservation confirmed! Your Butler concierge will manage details.',
    booking
  });
});

module.exports = router;
