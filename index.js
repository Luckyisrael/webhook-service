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

    // Log the received raw data
    console.log('Received webhook data:', JSON.stringify(data, null, 2));

    // Send raw data back to the client (without any modifications)
    res.status(200).json(data);

    // Optionally, store and emit the data if needed
    recentTransactions.unshift(data);
    if (recentTransactions.length > MAX_STORED_TRANSACTIONS) {
      recentTransactions.pop();
    }

    // Emit the raw data to all connected clients (optional)
    io.emit('streamData', data);

  } catch (error) {
    console.error('Error processing webhook:', error);
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
