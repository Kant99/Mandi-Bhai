const Order = require('../../Models/Common/Order');
const { apiResponse } = require('../../utils/apiResponse');
const RetailerProfile = require('../../Models/Retailer/Profile');

/**
 * Get all orders for the logged-in wholesaler
 */
exports.getAllOrdersForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const orders = await Order.find({ wholesalerId })
      .populate('retailerId', 'name phoneNumber address')
      .sort({ createdAt: -1 });
    if (orders.length === 0) {
      return res.status(404).json(apiResponse(404, false, 'No orders found for this wholesaler'));
    }
    return res.status(200).json(apiResponse(200, true, 'Orders retrieved successfully', { orders }));
  } catch (error) {
    console.log('Error in getAllOrdersForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve orders'));
  }
};

/**
 * Get a single order by ID (wholesaler can only access their own orders)
 */
exports.getOrderByIdForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, wholesalerId })
      .populate('retailerId', 'name phoneNumber address');
    if (!order) {
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }
    return res.status(200).json(apiResponse(200, true, 'Order retrieved successfully', { order }));
  } catch (error) {
    console.log('Error in getOrderByIdForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve order'));
  }
};

/**
 * Update order status (confirm, dispatch, deliver, reject, cancel) - wholesaler only for their orders
 */
exports.updateOrderStatusForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { orderId } = req.params;
    const { status, cancellationReason, notes } = req.body;
    const validStatuses = [
      'confirmed',
      'dispatched',
      'delivered',
      'cancelled',
      'rejected'
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(apiResponse(400, false, 'Invalid status update'));
    }
    const order = await Order.findOne({ _id: orderId, wholesalerId });
    if (!order) {
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }
    order.status = status;
    if (cancellationReason) order.cancellationReason = cancellationReason;
    if (notes) order.notes = notes;
    await order.save();
    return res.status(200).json(apiResponse(200, true, 'Order status updated successfully', { order }));
  } catch (error) {
    console.log('Error in updateOrderStatusForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to update order status'));
  }
};

/**
 * Delete an order (wholesaler can only delete their own orders)
 * Note: In real-world, deleting orders is rare; usually, status is set to cancelled/rejected.
 */
exports.deleteOrderForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, wholesalerId });
    if (!order) {
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }
    await order.deleteOne();
    return res.status(200).json(apiResponse(200, true, 'Order deleted successfully'));
  } catch (error) {
    console.log('Error in deleteOrderForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to delete order'));
  }
};

/**
 * Create a new order (for testing/admin; typically, retailers create orders)
 * Now supports vehicleNumber
 */
exports.createOrderForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const {
      retailerId,
      products,
      deliveryAddress,
      deliveryDate,
      orderTotal,
      paymentMethod,
      notes,
      vehicleNumber
    } = req.body;
    if (!retailerId || !products || !deliveryAddress || !orderTotal) {
      return res.status(400).json(apiResponse(400, false, 'Missing required fields'));
    }
    const order = new Order({
      wholesalerId,
      retailerId,
      products,
      deliveryAddress,
      deliveryDate,
      orderTotal,
      paymentMethod: paymentMethod || 'cod',
      notes,
      vehicleNumber
    });
    await order.save();
    return res.status(201).json(apiResponse(201, true, 'Order created successfully', { order }));
  } catch (error) {
    console.log('Error in createOrderForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to create order'));
  }
};

/**
 * Search/filter orders for wholesaler (by status, date, retailer, payment method, order amount, vehicle number, etc.)
 */
exports.searchOrdersForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { status, retailerId, fromDate, toDate, minTotal, maxTotal, paymentMethod, vehicleNumber } = req.query;
    const query = { wholesalerId };
    // Filter by order status
    if (status) query.status = status;
    // Filter by retailer
    if (retailerId) query.retailerId = retailerId;
    // Filter by date range
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }
    // Filter by order amount
    if (minTotal || maxTotal) {
      query.orderTotal = {};
      if (minTotal) query.orderTotal.$gte = Number(minTotal);
      if (maxTotal) query.orderTotal.$lte = Number(maxTotal);
    }
    // Filter by payment method
    if (paymentMethod) query.paymentMethod = paymentMethod;
    // Filter by vehicle number
    if (vehicleNumber) query.vehicleNumber = vehicleNumber;
    const orders = await Order.find(query)
      .populate('retailerId', 'name phoneNumber address')
      .sort({ createdAt: -1 });
    return res.status(200).json(apiResponse(200, true, 'Orders retrieved successfully', { orders }));
  } catch (error) {
    console.log('Error in searchOrdersForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to search orders'));
  }
};

/**
 * TEMPORARY: Create a dummy retailer profile for testing order endpoints
 * Remove or protect this endpoint in production!
 */
exports.createDummyRetailer = async (req, res) => {
  try {
    // You can customize these values as needed
    const dummyData = {
      retailerId: req.body.retailerId || undefined, // Optionally link to an Auth user
      name: req.body.name || 'Dummy Retailer',
      phoneNumber: req.body.phoneNumber || '9999999999',
      address: req.body.address || 'Test Address'
    };
    const retailer = new RetailerProfile(dummyData);
    await retailer.save();
    return res.status(201).json(apiResponse(201, true, 'Dummy retailer created', { retailer }));
  } catch (error) {
    console.log('Error in createDummyRetailer:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to create dummy retailer'));
  }
};

// The above functions are for wholesaler POV. For retailer POV, similar functions can be created referencing retailerId.
