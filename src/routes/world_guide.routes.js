const express = require('express');
const router = express.Router();
const db = require('../db/store');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @openapi
 * /api/world-guide/countries:
 *   get:
 *     summary: Retrieve list of country guides with optional search filtering
 *     tags: [World Guide]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query by country name, code, or capital
 *     responses:
 *       200:
 *         description: List of country guides
 */
router.get('/countries', (req, res) => {
  const search = req.query.search || '';
  const countries = db.getCountries(search);
  const savedCountries = db.getSavedCountries();
  return res.json({
    success: true,
    countries,
    savedCountries
  });
});

/**
 * @openapi
 * /api/world-guide/countries/{code}:
 *   get:
 *     summary: Get detailed country guide by 2-letter country code (e.g. FR, JP, NG, UK, US)
 *     tags: [World Guide]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         example: FR
 *     responses:
 *       200:
 *         description: Country details, emergency numbers, healthcare & money transfer guides.
 *       404:
 *         description: Country guide not found.
 */
router.get('/countries/:code', (req, res) => {
  const country = db.getCountryByCode(req.params.code);
  if (!country) {
    return res.status(404).json({ success: false, error: 'Country guide not found' });
  }
  return res.json({
    success: true,
    country
  });
});

/**
 * @openapi
 * /api/world-guide/saved/{code}:
 *   post:
 *     summary: Toggle save status for a country guide
 *     tags: [World Guide]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         example: FR
 *     responses:
 *       200:
 *         description: Updated save state.
 */
router.post('/saved/:code', (req, res) => {
  const result = db.toggleSavedCountry(req.params.code);
  return res.json({
    success: true,
    message: result.isSaved ? 'Country saved to your bookmarks' : 'Country removed from bookmarks',
    ...result
  });
});

/**
 * @openapi
 * /api/world-guide/saved:
 *   get:
 *     summary: Get user's saved country guides
 *     tags: [World Guide]
 *     responses:
 *       200:
 *         description: List of saved country guides
 */
router.get('/saved', (req, res) => {
  const savedCountries = db.getSavedCountries();
  return res.json({
    success: true,
    savedCountries
  });
});

module.exports = router;
