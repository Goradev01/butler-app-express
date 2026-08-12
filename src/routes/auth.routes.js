const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/store');
const { generateToken, authenticateToken } = require('../middleware/auth.middleware');
const { sendVerificationOtpEmail } = require('../services/email.service');

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Create a new account and send OTP via Resend
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: gentleman@butler.app
 *               password:
 *                 type: string
 *                 example: SecretPassword123!
 *     responses:
 *       201:
 *         description: Account created successfully. Verification OTP code sent via Resend.
 *       400:
 *         description: Invalid input or user already exists.
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = db.createUser(email, passwordHash);
    const token = generateToken(user.id);

    // Send OTP via Resend API
    const emailResult = await sendVerificationOtpEmail(user.email, user.verificationCode);

    return res.status(201).json({
      success: true,
      message: emailResult.success
        ? 'Account created successfully. Verification OTP has been sent to your email address via Resend.'
        : 'Account created successfully. (Email delivery log noted).',
      verificationCode: user.verificationCode, // Provided for convenience
      emailSent: emailResult.success,
      token,
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP verification code via Resend
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: gentleman@butler.app
 *     responses:
 *       200:
 *         description: Verification OTP sent via Resend.
 *       400:
 *         description: Email is required or user not found.
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, error: 'User account not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, error: 'Account is already verified.' });
    }

    // Generate fresh OTP code
    user.verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    db.saveData();

    // Send email using Resend
    const emailResult = await sendVerificationOtpEmail(user.email, user.verificationCode);

    return res.json({
      success: true,
      message: 'A new OTP verification code has been dispatched to your email via Resend.',
      verificationCode: user.verificationCode,
      emailSent: emailResult.success
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify account email with OTP verification code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 example: gentleman@butler.app
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully.
 *       400:
 *         description: Invalid code or email.
 */
router.post('/verify-email', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
  }

  const result = db.verifyUserEmail(email, code);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.message });
  }

  const token = generateToken(result.user.id);
  return res.json({
    success: true,
    message: 'Email verified successfully!',
    token,
    user: {
      id: result.user.id,
      email: result.user.email,
      isVerified: result.user.isVerified
    }
  });
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login into account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: gentleman@butler.app
 *               password:
 *                 type: string
 *                 example: SecretPassword123!
 *     responses:
 *       200:
 *         description: Logged in successfully. Returns JWT token.
 *       401:
 *         description: Invalid credentials.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);
    return res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
        profile: user.profile,
        hobbies: user.hobbies,
        joinedHouse: user.joinedHouse
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get currently logged in user profile & status
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details.
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      isVerified: req.user.isVerified,
      profile: req.user.profile,
      hobbies: req.user.hobbies,
      joinedHouse: req.user.joinedHouse
    }
  });
});

module.exports = router;
