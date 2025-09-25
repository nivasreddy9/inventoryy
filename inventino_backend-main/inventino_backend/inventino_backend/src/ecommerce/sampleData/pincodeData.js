const samplePincodes = [
  // Delhi NCR
  {
    pincode: "110001",
    isServiceable: true,
    estimatedDeliveryDays: 2,
    region: "North",
    state: "Delhi",
    city: "New Delhi"
  },
  {
    pincode: "110002",
    isServiceable: true,
    estimatedDeliveryDays: 2,
    region: "North",
    state: "Delhi",
    city: "New Delhi"
  },
  {
    pincode: "110003",
    isServiceable: true,
    estimatedDeliveryDays: 2,
    region: "North",
    state: "Delhi",
    city: "New Delhi"
  },
  {
    pincode: "110004",
    isServiceable: true,
    estimatedDeliveryDays: 2,
    region: "North",
    state: "Delhi",
    city: "New Delhi"
  },
  {
    pincode: "110005",
    isServiceable: true,
    estimatedDeliveryDays: 2,
    region: "North",
    state: "Delhi",
    city: "New Delhi"
  },

  // Mumbai
  {
    pincode: "400001",
    isServiceable: true,
    estimatedDeliveryDays: 3,
    region: "West",
    state: "Maharashtra",
    city: "Mumbai"
  },
  {
    pincode: "400002",
    isServiceable: true,
    estimatedDeliveryDays: 3,
    region: "West",
    state: "Maharashtra",
    city: "Mumbai"
  },
  {
    pincode: "400003",
    isServiceable: true,
    estimatedDeliveryDays: 3,
    region: "West",
    state: "Maharashtra",
    city: "Mumbai"
  },

  // Bangalore
  {
    pincode: "560001",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "South",
    state: "Karnataka",
    city: "Bangalore"
  },
  {
    pincode: "560002",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "South",
    state: "Karnataka",
    city: "Bangalore"
  },
  {
    pincode: "560003",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "South",
    state: "Karnataka",
    city: "Bangalore"
  },

  // Chennai
  {
    pincode: "600001",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "South",
    state: "Tamil Nadu",
    city: "Chennai"
  },
  {
    pincode: "600002",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "South",
    state: "Tamil Nadu",
    city: "Chennai"
  },

  // Kolkata
  {
    pincode: "700001",
    isServiceable: true,
    estimatedDeliveryDays: 5,
    region: "East",
    state: "West Bengal",
    city: "Kolkata"
  },
  {
    pincode: "700002",
    isServiceable: true,
    estimatedDeliveryDays: 5,
    region: "East",
    state: "West Bengal",
    city: "Kolkata"
  },

  // Pune
  {
    pincode: "411001",
    isServiceable: true,
    estimatedDeliveryDays: 3,
    region: "West",
    state: "Maharashtra",
    city: "Pune"
  },
  {
    pincode: "411002",
    isServiceable: true,
    estimatedDeliveryDays: 3,
    region: "West",
    state: "Maharashtra",
    city: "Pune"
  },

  // Ahmedabad
  {
    pincode: "380001",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "West",
    state: "Gujarat",
    city: "Ahmedabad"
  },
  {
    pincode: "380002",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "West",
    state: "Gujarat",
    city: "Ahmedabad"
  },

  // Jaipur
  {
    pincode: "302001",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "North",
    state: "Rajasthan",
    city: "Jaipur"
  },
  {
    pincode: "302002",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "North",
    state: "Rajasthan",
    city: "Jaipur"
  },

  // Lucknow
  {
    pincode: "226001",
    isServiceable: true,
    estimatedDeliveryDays: 4,
    region: "North",
    state: "Uttar Pradesh",
    city: "Lucknow"
  },

  // Chandigarh
  {
    pincode: "160001",
    isServiceable: true,
    estimatedDeliveryDays: 3,
    region: "North",
    state: "Chandigarh",
    city: "Chandigarh"
  },

  // Non-serviceable areas (for testing)
  {
    pincode: "123456",
    isServiceable: false,
  estimatedDeliveryDays: 1,
    region: "North",
    state: "Haryana",
    city: "Test City"
  },
  {
    pincode: "654321",
    isServiceable: false,
    estimatedDeliveryDays: 1,
    region: "South",
    state: "Kerala",
    city: "Test City"
  },
  // Added Bangalore pincode as requested
  {
    pincode: "560001",
    isServiceable: true,
    estimatedDeliveryDays: 2,
    region: "South",
    state: "Karnataka",
    city: "Bangalore"
  }
];

export { samplePincodes };
