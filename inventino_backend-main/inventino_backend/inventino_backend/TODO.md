# TODO: Update Product Images to Store in MongoDB

## Tasks
- [x] Update Product.js schema: Change images field to store Buffer and contentType
- [x] Update productRoutes.js: Import multer and configure memoryStorage
- [x] Modify POST / route: Handle form-data with multiple images, save as buffers
- [x] Add GET /:id/image/:index route: Serve image buffer with correct content-type
- [x] Modify PUT /:id route: Handle new images and replace existing if provided
- [x] Add DELETE /:id/image/:index route: Delete specific image from product
- [x] Test with Postman: Create product with images, fetch image, update, delete image
