const sampleOrders = [
  {
    user: "507f1f77bcf86cd799439011", // Sample user ID - John Doe
    orderNumber: "ORD-1703123456789-ABC123",
    items: [
      {
        product: "507f1f77bcf86cd799439012", // Sample product ID
        quantity: 2,
        price: 29.99
      },
      {
        product: "507f1f77bcf86cd799439013", // Sample product ID
        quantity: 1,
        price: 49.99
      }
    ],
    shippingAddress: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA"
    },
    paymentMethod: "credit_card",
    paymentStatus: "completed",
    orderStatus: "delivered", // ✅ CANNOT be cancelled (already delivered)
    totalAmount: 109.97,
    trackingNumber: "TRK123456789",
    estimatedDelivery: new Date("2024-01-15"),
    notes: "Leave at front door"
  },
  {
    user: "507f1f77bcf86cd799439011", // Same user - John Doe
    orderNumber: "ORD-1703123456790-DEF456", // 🎯 USE THIS FOR CANCEL TESTING
    items: [
      {
        product: "507f1f77bcf86cd799439014", // Sample product ID
        quantity: 3,
        price: 19.99
      }
    ],
    shippingAddress: {
      street: "456 Oak Ave",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90210",
      country: "USA"
    },
    paymentMethod: "paypal",
    paymentStatus: "pending",
    orderStatus: "pending", // ✅ CAN be cancelled (pending status)
    totalAmount: 59.97,
    notes: "Fragile items - CANCELLABLE ORDER"
  },
  {
    user: "507f1f77bcf86cd799439011", // Same user - John Doe
    orderNumber: "ORD-1703123456792-JKL012", // Another cancellable order
    items: [
      {
        product: "507f1f77bcf86cd799439016", // Sample product ID
        quantity: 1,
        price: 99.99
      }
    ],
    shippingAddress: {
      street: "789 Elm St",
      city: "Boston",
      state: "MA",
      zipCode: "02101",
      country: "USA"
    },
    paymentMethod: "upi",
    paymentStatus: "pending",
    orderStatus: "processing", // ✅ CAN be cancelled (processing status)
    totalAmount: 99.99,
    notes: "Another cancellable order for testing"
  },
  {
    user: "507f1f77bcf86cd799439015", // Different user - Jane Smith
    orderNumber: "ORD-1703123456791-GHI789",
    items: [
      {
        product: "507f1f77bcf86cd799439016", // Sample product ID
        quantity: 1,
        price: 99.99
      },
      {
        product: "507f1f77bcf86cd799439017", // Sample product ID
        quantity: 2,
        price: 39.99
      }
    ],
    shippingAddress: {
      street: "789 Pine St",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      country: "USA"
    },
    paymentMethod: "debit_card",
    paymentStatus: "completed",
    orderStatus: "shipped", // ❌ CANNOT be cancelled (already shipped)
    totalAmount: 219.97,
    trackingNumber: "TRK987654321",
    estimatedDelivery: new Date("2024-01-20")
  }
];

const sampleUsers = [
  {
    _id: "507f1f77bcf86cd799439011",
    name: "John Doe",
    email: "john.doe@example.com"
  },
  {
    _id: "507f1f77bcf86cd799439015",
    name: "Jane Smith",
    email: "jane.smith@example.com"
  }
];

const sampleProducts = [
  {
    _id: "507f1f77bcf86cd799439012",
    name: "Wireless Headphones",
    price: 29.99,
    category: "Electronics"
  },
  {
    _id: "507f1f77bcf86cd799439013",
    name: "Smart Watch",
    price: 49.99,
    category: "Electronics"
  },
  {
    _id: "507f1f77bcf86cd799439014",
    name: "Coffee Mug",
    price: 19.99,
    category: "Kitchen"
  },
  {
    _id: "507f1f77bcf86cd799439016",
    name: "Laptop",
    price: 99.99,
    category: "Electronics"
  },
  {
    _id: "507f1f77bcf86cd799439017",
    name: "Book",
    price: 39.99,
    category: "Books"
  }
];

export { sampleOrders, sampleUsers, sampleProducts };
