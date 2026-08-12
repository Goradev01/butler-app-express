const express = require('express');
const router = express.Router();
const db = require('../db/store');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @openapi
 * /api/feed:
 *   get:
 *     summary: Fetch activity feed with level chapter filtering (Global, Country, City, Town)
 *     tags: [Activity Feed]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         example: global
 *         description: Filter feed level (global, country, city, town, or all)
 *       - in: query
 *         name: houseId
 *         schema:
 *           type: string
 *         example: percival
 *         description: Filter by House ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of feed post items.
 */
router.get('/', (req, res) => {
  const { level, houseId, search } = req.query;
  const feeds = db.getFeedsByLevel(level || 'all', houseId, search);
  return res.json({
    success: true,
    count: feeds.length,
    level: level || 'all',
    feeds
  });
});

/**
 * @openapi
 * /api/feed/posts:
 *   post:
 *     summary: Create a new activity post in feed
 *     tags: [Activity Feed]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Weekend Equestrian Gathering
 *               content:
 *                 type: string
 *                 example: Inviting all House members to join our equestrian expedition this Saturday.
 *               category:
 *                 type: string
 *                 example: Sports
 *     responses:
 *       201:
 *         description: Post created successfully.
 */
router.post('/posts', authenticateToken, (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, error: 'Title and content are required.' });
  }

  const post = db.createFeedPost(req.user.id, { title, content, category });
  return res.status(201).json({
    success: true,
    message: 'Activity post published successfully!',
    post
  });
});

/**
 * @openapi
 * /api/feed/posts/{id}/like:
 *   post:
 *     summary: Like an activity feed post
 *     tags: [Activity Feed]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post liked successfully.
 */
router.post('/posts/:id/like', (req, res) => {
  const post = db.likeFeedPost(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Feed post not found' });
  }
  return res.json({
    success: true,
    message: 'Post liked!',
    post
  });
});

/**
 * @openapi
 * /api/feed/posts/{id}/rsvp:
 *   post:
 *     summary: Toggle RSVP for an event post
 *     tags: [Activity Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RSVP state updated.
 */
router.post('/posts/:id/rsvp', authenticateToken, (req, res) => {
  const post = db.rsvpFeedPost(req.user.id, req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Event post not found' });
  }
  return res.json({
    success: true,
    message: post.isRsvped ? 'RSVP confirmed! Added to your schedule.' : 'RSVP cancelled.',
    post
  });
});

module.exports = router;
