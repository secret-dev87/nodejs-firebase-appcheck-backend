const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Sequelize, Model, DataTypes } = require('sequelize');
require('dotenv').config()

const firebase_admin = require('firebase-admin');
const admin = firebase_admin.initializeApp({
  credential: firebase_admin.credential.cert({
    "type": process.env.GOOGLE_SERVICE_TYPE,
    "project_id": process.env.GOOGLE_PROJECT_ID,
    "private_key_id": process.env.GOOGLE_PRIVATE_KEY_ID,
    "private_key": process.env.GOOGLE_PRIVATE_KEY,
    "client_email": process.env.GOOGLE_CLIENT_EMAIL,
    "client_id": process.env.GOOGLE_CLIENT_ID,
    "auth_uri": process.env.GOOGLE_AUTH_URI,
    "token_uri": process.env.GOOGLE_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.GOOGLE_CLIENT_X509_CERT_URL,
    "universe_domain": process.env.GOOGLE_UNIVERSE_DOMAIN
  })
});
const { getAppCheck } = require('firebase-admin/app-check');

const app = express();

const appCheckVerification = async (req, res, next) => {
  const appCheckToken = req.header("X-Firebase-AppCheck");

  if (!appCheckToken) {
    res.status(401);
    return next("Unauthorized");
  }

  try {
    const appCheckClaims = await getAppCheck().verifyToken(appCheckToken);
    return next();
  } catch (err) {
    res.status(401);    
    return next('Unauthorized');
  }
}

const port = 3000;

const corsOptions = {
  Credentials: true,
  origin: '*'
}

app.use(cors(corsOptions))

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

class User extends Model {}
User.init({
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  password: DataTypes.STRING
}, { sequelize, modelName: 'user' });

sequelize.sync();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/api/users', [appCheckVerification], async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

app.get('/api/users/:id', [appCheckVerification], async (req, res) => {
  const user = await User.findByPk(req.params.id);
  res.json(user);
});

app.post('/api/users', [appCheckVerification], async (req, res) => {
  const user = await User.create(req.body);
  res.json(user);
});

app.put('/api/users/:id', [appCheckVerification], async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (user) {
    await user.update(req.body);
    res.json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.delete('/api/users/:id', [appCheckVerification], async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (user) {
    await user.destroy();
    res.json({ message: 'User deleted' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
