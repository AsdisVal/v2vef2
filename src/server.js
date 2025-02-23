/*********************************************************************
 * @ClassName server
 * server.js er entry pointið í appið. Það setur upp Express server,
 * sér um styllingar og segir servernum að nota routes.js til þess
 * að sjá um mismunandi vef requestur.
 *
 * Vorönn 2025
 * @author Ásdís Valtýsdóttir
 *********************************************************************/

import express from 'express';
import { router } from './routes.js';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); //leyfir url encoded gögnum

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viewsPath = path.join(__dirname, 'views');

app.set('views', viewsPath);
app.set('view engine', 'ejs');

app.use('/', router);

app.use((req, res) => {
  res.status(404).render('404', { message: 'Síða fannst ekki.' });
});

const hostname = '127.0.0.1';
const port = 3000;

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
