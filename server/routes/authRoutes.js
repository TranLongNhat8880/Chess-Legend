const express = require('express');
const router = express.Router();

// 1. Import Controller
const { registerUser, loginUser, getUserStats, updateProfile } = require('../controllers/authControllers');
const { getMatchHistory, getMatchMoves } = require('../controllers/matchController');

// 2. Định nghĩa Route
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/stats', getUserStats);
router.post('/update', updateProfile); // <--- DÒNG BẠN ĐANG THIẾU

router.post('/history', getMatchHistory);
router.post('/replay', getMatchMoves);

module.exports = router;