const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/order/order');

// TEMPORARY: Create a dummy retailer for testing
router.post('/dummy-retailer', orderController.createDummyRetailer);

// Create a new order (for testing/admin)
router.post('/', orderController.createOrderForWholesaler);

// Get all orders for wholesaler
router.get('/', orderController.getAllOrdersForWholesaler);

// Get a single order by ID
router.get('/:orderId', orderController.getOrderByIdForWholesaler);

// Update order status
router.patch('/:orderId/status', orderController.updateOrderStatusForWholesaler);

// Delete an order
router.delete('/:orderId', orderController.deleteOrderForWholesaler);

// Search/filter orders
router.get('/search/filter', orderController.searchOrdersForWholesaler);

module.exports = router; 