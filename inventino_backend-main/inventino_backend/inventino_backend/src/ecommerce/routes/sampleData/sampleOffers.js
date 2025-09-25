// Sample Offers Data for Testing
export const sampleOffers = [
  {
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    description: "Welcome discount for new customers - 10% off on orders above ₹500",
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    minimumOrderAmount: 500,
    maximumDiscount: 200,
    usageLimit: 1000,
    isActive: true,
    userSpecific: false,
    createdBy: "64a1f2b3c4d5e6f789012345" // Admin ID
  },
  {
    code: "FLAT100",
    type: "fixed",
    value: 100,
    description: "Flat ₹100 off on orders above ₹1000",
    startDate: new Date(),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    minimumOrderAmount: 1000,
    usageLimit: 500,
    isActive: true,
    userSpecific: false,
    createdBy: "64a1f2b3c4d5e6f789012345"
  },
  {
    code: "FLASH50",
    type: "percentage",
    value: 50,
    description: "Flash Sale - 50% off on electronics (max discount ₹500)",
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    minimumOrderAmount: 200,
    maximumDiscount: 500,
    usageLimit: 200,
    isActive: true,
    userSpecific: false,
    applicableCategories: ["64a1f2b3c4d5e6f789012346"], // Electronics category
    createdBy: "64a1f2b3c4d5e6f789012345"
  },
  {
    code: "LOYALTY20",
    type: "percentage",
    value: 20,
    description: "Loyalty program discount for premium customers",
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    minimumOrderAmount: 1000,
    maximumDiscount: 300,
    usageLimit: null, // Unlimited
    isActive: true,
    userSpecific: true,
    allowedUsers: [
      "64a1f2b3c4d5e6f789012347",
      "64a1f2b3c4d5e6f789012348"
    ],
    createdBy: "64a1f2b3c4d5e6f789012345"
  },
  {
    code: "SEASONAL25",
    type: "percentage",
    value: 25,
    description: "Seasonal offer - 25% off on fashion items",
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Starts in 2 days
    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
    minimumOrderAmount: 800,
    maximumDiscount: 400,
    usageLimit: 300,
    isActive: true,
    userSpecific: false,
    applicableCategories: ["64a1f2b3c4d5e6f789012349"], // Fashion category
    createdBy: "64a1f2b3c4d5e6f789012345"
  },
  {
    code: "EXPIRED15",
    type: "percentage",
    value: 15,
    description: "Expired offer for testing",
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Started 10 days ago
    endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Ended 2 days ago
    minimumOrderAmount: 300,
    usageLimit: 100,
    isActive: false,
    userSpecific: false,
    createdBy: "64a1f2b3c4d5e6f789012345"
  }
];

// Sample usage scenarios for testing
export const sampleUsageScenarios = {
  validCoupon: {
    code: "WELCOME10",
    orderAmount: 600,
    expectedDiscount: 60, // 10% of 600
    userId: "64a1f2b3c4d5e6f789012347"
  },
  minimumAmountNotMet: {
    code: "FLAT100",
    orderAmount: 800,
    expectedError: "Minimum order amount of ₹1000 required"
  },
  expiredCoupon: {
    code: "EXPIRED15",
    orderAmount: 500,
    expectedError: "Invalid or expired coupon code"
  },
  userSpecificValid: {
    code: "LOYALTY20",
    orderAmount: 1200,
    expectedDiscount: 240, // 20% of 1200
    userId: "64a1f2b3c4d5e6f789012347"
  },
  userSpecificInvalid: {
    code: "LOYALTY20",
    orderAmount: 1200,
    expectedError: "This coupon is not available for your account",
    userId: "64a1f2b3c4d5e6f789012350" // User not in allowed list
  },
  maxDiscountCap: {
    code: "FLASH50",
    orderAmount: 1500,
    expectedDiscount: 500, // Capped at max discount
    userId: "64a1f2b3c4d5e6f789012347"
  }
};
