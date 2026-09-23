const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

function createApp(pool) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // make pool availble to routes via app.locals
  app.locals.pool = pool;
  app.use('/api', require('./routes/upload'));

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
