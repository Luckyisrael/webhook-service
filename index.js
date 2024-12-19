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
  
      // Process each transaction
      data.transactions.forEach(transaction => {
        const transactionDetails = {
          blockHeight: data.blockHeight,
          blockTime: data.blockTime,
          blockhash: data.blockhash,
          parentSlot: data.parentSlot,
          previousBlockhash: data.previousBlockhash,
  
          // Transaction metadata
          computeUnitsConsumed: transaction.meta.computeUnitsConsumed,
          err: transaction.meta.err,
          fee: transaction.meta.fee,
          innerInstructions: transaction.meta.innerInstructions,
          logMessages: transaction.meta.logMessages,
          postBalances: transaction.meta.postBalances,
          postTokenBalances: transaction.meta.postTokenBalances,
          preBalances: transaction.meta.preBalances,
          preTokenBalances: transaction.meta.preTokenBalances,
          rewards: transaction.meta.rewards,
          status: transaction.meta.status,
  
          // Transaction message and instructions
          accountKeys: transaction.transaction.message.accountKeys.map(account => account.pubkey),
          instructions: transaction.transaction.message.instructions,
          recentBlockhash: transaction.transaction.message.recentBlockhash,
  
          // Signatures for the transaction
          signatures: transaction.signatures
        };
  
        console.log('Extracted Transaction Details:', JSON.stringify(transactionDetails, null, 2));
  
        // Add the transaction details to recent transactions
        recentTransactions.unshift(transactionDetails);
        if (recentTransactions.length > MAX_STORED_TRANSACTIONS) {
          recentTransactions.pop();
        }
  
        // Emit the transaction details to connected clients
        io.emit('streamData', transactionDetails);
      });
  
      // Send a success response
      res.status(200).send('Webhook received and transaction details processed');
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