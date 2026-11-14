'use strict';

const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const app = createApp({ log: (line) => console.log(line) });

app.listen(port, () => {
  console.log(`Predict 360 backend listening on http://localhost:${port}`);
});
