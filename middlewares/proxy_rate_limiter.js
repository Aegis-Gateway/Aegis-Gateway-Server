const { createClient } = require("redis");
const dotenv = require("dotenv");

dotenv.config();

const redis = createClient({ url: process.env.REDIS_URL });
redis.connect();

const proxyRateLimiter = async (req, res, next) => {
  const { project, endpoint } = req.params;
  const { limit } = req.endpointRecord;
  const ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
  const redisId = `rate-limit:${project}/${endpoint}/${ip}`;
  const requests = await redis.incr(redisId);
  if (requests === 1) {
    await redis.expire(redisId, 60);
  }
  if (requests > limit) {
    res.locals.message = "Rate limit exceeded";
    return res.status(429).json({
      success: false,
      message: "Requests over limit",
      data: null,
    });
  }
  next();
};

module.exports = {
  proxyRateLimiter,
};
