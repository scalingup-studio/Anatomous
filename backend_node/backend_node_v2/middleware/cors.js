// // middleware/cors.js
// module.exports = (req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }
//   next();
// };