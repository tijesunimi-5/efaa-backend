import jwt from 'jsonwebtoken'

const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return response.status(401).json({ error: "Access denied" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return response.status(403).json({ error: "Invalid token" });
    request.user = user;
    next();
  });
};

export default authenticateToken