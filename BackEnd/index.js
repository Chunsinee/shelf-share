const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ strict: false }));

app.use('/api/users', require('./routes/users'));
app.use('/api/books', require('./routes/books'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/categories', require('./routes/categories'));

app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/favorites', require('./routes/favorites')); 

app.use((err, req, res, next) => {
  console.error("🔥 Global Error Handler:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});

app.get('/', (req, res) => res.send('📚 ShelfShare API Running...'));

cron.schedule('*/5 * * * *', async () => {
  console.log('⏰ [CRON] Running maintenance tasks...');

  try {
    
    const loanResponse = await axios.post(`http://localhost:${PORT}/api/loans/auto-return`);
    console.log('✅ [CRON] Auto-return:', loanResponse.data);
  } catch (error) {
    console.error('❌ [CRON] Auto-return error:', error.message);
  }

  try {
    
    const resResponse = await axios.post(`http://localhost:${PORT}/api/reservations/process-expired`);
    console.log('✅ [CRON] Process expired:', resResponse.data);
  } catch (error) {
    console.error('❌ [CRON] Process expired error:', error.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏰ Cron jobs active: Auto-return & expired reservations every 5 minutes`);
});