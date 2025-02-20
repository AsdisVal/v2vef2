import express from 'express';
import { router } from './routes.js';

import { fileURLToPath } from 'url';
import path from 'path';

const app = express();

app.use(express.urlencoded({ extended: true })); //leyfir url encoded gögnum

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viewsPath = path.join(__dirname, 'views');

app.set('views', viewsPath);
app.set('view engine', 'ejs');

app.use('/', router);

const hostname = '127.0.0.1';
const port = 3000;

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
