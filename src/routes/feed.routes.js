const express = require('express');
const router = express.Router();
const db = require('../db/store');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @openapi
 * /api/feed:
 *   get:
 *     summary: Fetch personalized activity feed
 *     tags: [Activity Feed]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter feed posts by category
 *     responses:
 *       200:
 *         description: Array of feed post items.
 */
router.get('/', (req, res) => {
  const { category } = req.query;
  const feeds = db.getFeeds(null, category);
  return res.json({
    success: true,
    count: feeds.length,
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

module.exports = router;
