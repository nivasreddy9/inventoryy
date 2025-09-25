import { RateLimiterMemory } from 'rate-limiter-flexible';

// Create rate limiter for polling APIs
// Allow 10 requests per minute per user for polling endpoints
const pollingRateLimiter = new RateLimiterMemory({
  keyPrefix: 'polling',
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds (1 minute)
  blockDuration: 60, // Block for 1 minute if limit exceeded
});

// Rate limiter middleware for polling endpoints
export const pollingRateLimit = async (req, res, next) => {
  try {
    // Use user ID as the key for rate limiting
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for polling'
      });
    }

    // Consume a point for this request
    await pollingRateLimiter.consume(userId);

    // Add rate limit headers to response
    const rateLimitInfo = await pollingRateLimiter.get(userId);
    if (rateLimitInfo) {
      res.set({
        'X-RateLimit-Limit': pollingRateLimiter.points,
        'X-RateLimit-Remaining': Math.max(0, pollingRateLimiter.points - rateLimitInfo.consumedPoints),
        'X-RateLimit-Reset': new Date(Date.now() + rateLimitInfo.msBeforeNext).toISOString()
      });
    }

    next();
  } catch (rejRes) {
    const timeLeft = Math.round(rejRes.msBeforeNext / 1000) || 1;

    res.set({
      'X-RateLimit-Limit': pollingRateLimiter.points,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
      'Retry-After': timeLeft
    });

    res.status(429).json({
      success: false,
      message: 'Too many polling requests. Please wait before trying again.',
      retryAfter: timeLeft,
      limit: pollingRateLimiter.points,
      windowSeconds: pollingRateLimiter.duration
    });
  }
};

// General rate limiter for other endpoints (if needed)
export const generalRateLimiter = new RateLimiterMemory({
  keyPrefix: 'general',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 300, // Block for 5 minutes if limit exceeded
});

export default {
  pollingRateLimit,
  generalRateLimiter
};
