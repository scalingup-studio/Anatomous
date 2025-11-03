// middleware/auth.js
module.exports = (req, res, next) => {
  // Дозволити OPTIONS запити (preflight) без авторизації
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Додати CORS headers для всіх відповідей
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // Перевірка авторизації для інших методів
  // if (req.headers.authorization !== `Bearer ${process.env.SECRET_KEY}`) {
  //   return res.status(401).json({ error: "Unauthorized" });
  // }
  next();
};