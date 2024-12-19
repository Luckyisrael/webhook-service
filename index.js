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

app.post('/webhook', (req, res) => {
    try {
      const data = req.body;
      console.log('Received Webhook Data:', JSON.stringify(data, null, 2)); // Log incoming data
  
      // Check if transactions array exists and contains data
      if (!data.transactions || data.transactions.length === 0) {
        console.error('No transactions found in the received data');
        return res.status(400).send('No transactions found in the webhook data');
      }
  
      // Send the raw data to the frontend
      io.emit('streamData', data); // Send entire raw data to frontend
  
      // Send a success response
      res.status(200).send('Webhook received and raw data processed');
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
