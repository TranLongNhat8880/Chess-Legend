const express = require('express');
const router = express.Router();
const { 
    registerUser, loginUser, getUserStats, 
    updateAvatar, updatePassword, 
    requestPasswordReset, resetPassword 
} = require('../controllers/authControllers');
const { getMatchHistory, getMatchMoves } = require('../controllers/matchController');

// User Auth
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/stats', getUserStats);

// Profile Update (Tách riêng)
router.post('/update/avatar', updateAvatar);
router.post('/update/password', updatePassword);

// Forgot Password
router.post('/forgot', requestPasswordReset);
router.post('/reset', resetPassword);

// Game Data
router.post('/history', getMatchHistory);
router.post('/replay', getMatchMoves);

module.exports = router;