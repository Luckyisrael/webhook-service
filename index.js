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
      console.log('Received Solana transaction data:', JSON.stringify(data, null, 2));
  
      // Check if 'transactions' exist and extract the first transaction (if present)
      if (data.transactions && data.transactions.length > 0) {
        const transaction = data.transactions[0];  // We're focusing on the first transaction
  
        // Extract relevant details from the response
        const transactionDetails = {
          blockHeight: data.blockHeight,
          blockTime: data.blockTime,
          blockhash: data.blockhash,
          parentSlot: data.parentSlot,
          previousBlockhash: data.previousBlockhash,
          fee: transaction.meta.fee,
          computeUnitsConsumed: transaction.meta.computeUnitsConsumed,
          accountKeys: transaction.transaction.message.accountKeys.map(account => account.pubkey),
          instructions: transaction.transaction.message.instructions,
          status: transaction.meta.status
        };
  
        console.log('Extracted Transaction Details:', JSON.stringify(transactionDetails, null, 2));
  
        // Add to recent transactions
        recentTransactions.unshift(transactionDetails);
        if (recentTransactions.length > MAX_STORED_TRANSACTIONS) {
          recentTransactions.pop();
        }
  
        // Emit to all connected clients
        io.emit('streamData', transactionDetails);
  
        res.status(200).send('Webhook received and transaction details processed');
      } else {
        res.status(400).send('No transactions found in the webhook data');
      }
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