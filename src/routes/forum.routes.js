const express = require('express');
const router = express.Router();
const db = require('../db/store');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @openapi
 * /api/forum/categories:
 *   get:
 *     summary: Retrieve forum discussion categories
 *     tags: [Forum]
 *     responses:
 *       200:
 *         description: List of categories (Relationship, Career, Family, Finance, Health, Personal)
 */
router.get('/categories', (req, res) => {
  const categories = db.getForumCategories();
  return res.json({
    success: true,
    categories
  });
});

/**
 * @openapi
 * /api/forum/discussions:
 *   get:
 *     summary: Retrieve list of forum discussion threads
 *     tags: [Forum]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter discussions by category (e.g., Career, Finance, Family)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Array of discussions
 */
router.get('/discussions', (req, res) => {
  const { category, search } = req.query;
  const discussions = db.getForumDiscussions(category, search);
  return res.json({
    success: true,
    discussions
  });
});

/**
 * @openapi
 * /api/forum/discussions/{id}:
 *   get:
 *     summary: Get single forum discussion by ID with replies
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: disc_1
 *     responses:
 *       200:
 *         description: Detailed discussion object with replies.
 *       404:
 *         description: Discussion not found.
 */
router.get('/discussions/:id', (req, res) => {
  const discussion = db.getForumDiscussionById(req.params.id);
  if (!discussion) {
    return res.status(404).json({ success: false, error: 'Discussion not found' });
  }
  return res.json({
    success: true,
    discussion
  });
});

/**
 * @openapi
 * /api/forum/discussions:
 *   post:
 *     summary: Create a new discussion circle post
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, title, currentSituation, feelings]
 *             properties:
 *               category:
 *                 type: string
 *                 example: Career
 *               title:
 *                 type: string
 *                 example: Establishing boundaries with stakeholders
 *               currentSituation:
 *                 type: string
 *                 example: Experiencing scope creep on recent projects.
 *               feelings:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Frustrated", "Anxious"]
 *               biggestChallenge:
 *                 type: string
 *                 example: Primary blocker is pushback on timelines.
 *     responses:
 *       201:
 *         description: Discussion post created successfully.
 */
router.post('/discussions', authenticateToken, (req, res) => {
  const { category, title, currentSituation, feelings, biggestChallenge, content } = req.body;
  if (!title || !category) {
    return res.status(400).json({ success: false, error: 'Category and Title are required.' });
  }

  const newDiscussion = db.createForumDiscussion(req.user.id, {
    category,
    title,
    currentSituation,
    feelings,
    biggestChallenge,
    content
  });

  return res.status(201).json({
    success: true,
    message: 'Discussion circle published successfully!',
    discussion: newDiscussion
  });
});

/**
 * @openapi
 * /api/forum/discussions/{id}/reply:
 *   post:
 *     summary: Post an experience-sharing reply to a discussion
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: I felt overwhelmed last year when facing similar expectations...
 *               outcome:
 *                 type: string
 *                 example: I set strict working hours and communicated early.
 *               lessonLearned:
 *                 type: string
 *                 example: Boundaries are respected when delivered calmly.
 *     responses:
 *       200:
 *         description: Reply added successfully.
 */
router.post('/discussions/:id/reply', authenticateToken, (req, res) => {
  const { content, outcome, lessonLearned } = req.body;
  if (!content) {
    return res.status(400).json({ success: false, error: 'Reply experience content is required.' });
  }

  const reply = db.addDiscussionReply(req.user.id, req.params.id, {
    content,
    outcome,
    lessonLearned
  });

  if (!reply) {
    return res.status(404).json({ success: false, error: 'Discussion circle not found' });
  }

  return res.json({
    success: true,
    message: 'Experience reply posted to circle!',
    reply
  });
});

/**
 * @openapi
 * /api/forum/notifications:
 *   get:
 *     summary: Retrieve forum notifications
 *     tags: [Forum]
 *     responses:
 *       200:
 *         description: List of forum notifications
 */
router.get('/notifications', (req, res) => {
  const notifications = db.getForumNotifications();
  return res.json({
    success: true,
    notifications
  });
});

module.exports = router;
