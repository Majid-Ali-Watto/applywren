import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

export const generateToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET must be defined");
  }

  const payload = {
    userId: user._id.toString(), // Ensure userId is a string
    email: user.email
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
