const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store recent transactions for new clients
const recentTransactions = [];
const MAX_STORED_TRANSACTIONS = 100;

// Middleware to parse JSON bodies with increased limit due to large Solana transaction data
app.use(express.json({ limit: '100mb' }));

// Handle webhook POST requests for Solana data
app.post('/webhook', (req, res) => {
  try {
    const data = req.body;
    console.log('Received Solana transaction data:', JSON.stringify(data, null, 2));

    // Extract relevant information
    const transaction = {
      slot: data.slot,
      confirmationCount: data.confirmation_count,
      timestamp: new Date().toISOString(),
      pubkey: data.pubkey,
      program: data.Program,
      computeUnits: data.computeUnits
    };

    // Add to recent transactions
    recentTransactions.unshift(transaction);
    if (recentTransactions.length > MAX_STORED_TRANSACTIONS) {
      recentTransactions.pop();
    }

    // Emit to all connected clients
    io.emit('streamData', transaction);
    
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Error processing Solana webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send recent transactions to newly connected client
  if (recentTransactions.length > 0) {
    socket.emit('streamData', recentTransactions);
  }

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, reason);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Solana webhook server running on port ${PORT}`);
});