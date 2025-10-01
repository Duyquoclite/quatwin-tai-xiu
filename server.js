const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'quatwin_secret_key_2024'; // Trong production nên dùng biến môi trường

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files

// JSON Database files
const USERS_DB = './database/users.json';
const GAMES_DIR = './database/games';

// Ensure database directory exists
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database');
}
if (!fs.existsSync(GAMES_DIR)) {
    fs.mkdirSync(GAMES_DIR);
}

// Initialize JSON databases
function initDatabase() {
    if (!fs.existsSync(USERS_DB)) {
        fs.writeFileSync(USERS_DB, JSON.stringify([], null, 2));
    }
}

// Read JSON database
function readDB(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
}

// Write JSON database
function writeDB(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        return false;
    }
}

// Get user game data file path
function getUserGameFile(username) {
    return `${GAMES_DIR}/${username}.json`;
}

// Read user game data
function readUserGameData(username) {
    const filePath = getUserGameFile(username);
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading user game data for ${username}:`, error);
        return [];
    }
}

// Write user game data
function writeUserGameData(username, data) {
    const filePath = getUserGameFile(username);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing user game data for ${username}:`, error);
        return false;
    }
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Routes

// Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const users = readDB(USERS_DB);
        
        // Check if user already exists
        if (users.find(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Store password without hashing (as requested)
        const newUser = {
            id: uuidv4(),
            username,
            password: password,
            balance: 1000000000, // 1 tỷ VND
            totalGames: 0,
            totalWins: 0,
            totalProfit: 0,
            currentStreak: 0,
            maxStreak: 0,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        writeDB(USERS_DB, users);

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                balance: newUser.balance
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const users = readDB(USERS_DB);
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isValidPassword = (password === user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                balance: user.balance,
                totalGames: user.totalGames,
                totalWins: user.totalWins,
                totalProfit: user.totalProfit
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
    try {
        const users = readDB(USERS_DB);
        const user = users.find(u => u.id === req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            username: user.username,
            balance: user.balance,
            totalGames: user.totalGames,
            totalWins: user.totalWins,
            totalProfit: user.totalProfit,
            currentStreak: user.currentStreak,
            maxStreak: user.maxStreak
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save game data
app.post('/api/save-game', authenticateToken, (req, res) => {
    try {
        const { balance, totalGames, totalWins, totalProfit, currentStreak, maxStreak, history, lastBetFormat } = req.body;

        const users = readDB(USERS_DB);
        const userIndex = users.findIndex(u => u.id === req.user.userId);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user data
        users[userIndex].balance = balance;
        users[userIndex].totalGames = totalGames;
        users[userIndex].totalWins = totalWins;
        users[userIndex].totalProfit = totalProfit;
        users[userIndex].currentStreak = currentStreak;
        users[userIndex].maxStreak = maxStreak;
        users[userIndex].lastBetFormat = lastBetFormat || '';
        users[userIndex].lastPlayed = new Date().toISOString();

        writeDB(USERS_DB, users);

        // Save game history to user's own file
        if (history && history.length > 0) {
            const userHistory = history.map(h => ({
                ...h,
                id: h.id || uuidv4()
            }));
            
            writeUserGameData(req.user.username, userHistory);
        }

        res.json({ message: 'Game data saved successfully' });

    } catch (error) {
        console.error('Save game error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user stats
app.get('/api/stats', authenticateToken, (req, res) => {
    try {
        const users = readDB(USERS_DB);
        const user = users.find(u => u.id === req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate additional stats from user's own file
        const userHistory = readUserGameData(req.user.username);
        
        // Calculate win rate
        const winRate = user.totalGames > 0 ? ((user.totalWins / user.totalGames) * 100).toFixed(1) : 0;
        
        // Calculate Tai/Xiu rates
        let taiCount = 0, xiuCount = 0;
        userHistory.forEach(h => {
            if (Number(h.sum) >= 11) taiCount++;
            else xiuCount++;
        });
        
        const taiRate = userHistory.length > 0 ? ((taiCount / userHistory.length) * 100).toFixed(1) : 0;
        const xiuRate = userHistory.length > 0 ? ((xiuCount / userHistory.length) * 100).toFixed(1) : 0;

        res.json({
            balance: user.balance,
            totalGames: user.totalGames,
            totalWins: user.totalWins,
            totalProfit: user.totalProfit,
            currentStreak: user.currentStreak,
            maxStreak: user.maxStreak,
            winRate: parseFloat(winRate),
            taiRate: parseFloat(taiRate),
            xiuRate: parseFloat(xiuRate),
            taiCount: taiCount,
            xiuCount: xiuCount,
            lastPlayed: user.lastPlayed
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Load game data
app.get('/api/load-game', authenticateToken, (req, res) => {
    try {
        const users = readDB(USERS_DB);
        const user = users.find(u => u.id === req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Load game history from user's own file
        const userHistory = readUserGameData(req.user.username);

        res.json({
            balance: user.balance,
            totalGames: user.totalGames,
            totalWins: user.totalWins,
            totalProfit: user.totalProfit,
            currentStreak: user.currentStreak,
            maxStreak: user.maxStreak,
            history: userHistory,
            lastBetFormat: user.lastBetFormat || ''
        });

    } catch (error) {
        console.error('Load game error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// GET /api/leaderboard - Get leaderboard data
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Leaderboard API called by user:', req.user.username);
        const users = readDB(USERS_DB);
        console.log('📊 Total users in DB:', users.length);
        
        // Sort users by balance (descending)
        const sortedUsers = users
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 50); // Top 50 players
        
        console.log('🏆 Top players:', sortedUsers.slice(0, 5).map(u => ({ username: u.username, balance: u.balance })));
        
        // Calculate totals
        const totalPlayers = users.length;
        const totalGames = users.reduce((sum, user) => sum + user.totalGames, 0);
        const totalWins = users.reduce((sum, user) => sum + user.totalWins, 0);
        const totalBalance = users.reduce((sum, user) => sum + user.balance, 0);
        
        const response = {
            players: sortedUsers,
            totalPlayers,
            totalGames,
            totalWins,
            totalBalance
        };
        
        console.log('📤 Sending response:', { 
            totalPlayers: response.totalPlayers, 
            totalGames: response.totalGames,
            totalWins: response.totalWins,
            totalBalance: response.totalBalance,
            playersCount: response.players.length
        });
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
initDatabase();
app.listen(PORT, () => {
    console.log(`🎲 QuấtWin Server running on http://localhost:${PORT}`);
    console.log(`📊 Database initialized`);
});
