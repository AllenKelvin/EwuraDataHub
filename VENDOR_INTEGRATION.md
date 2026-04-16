# Vendor API Integration Guide - Ewura Hub Wallet

## Overview

Ewura Hub Wallet is now integrated with **AllenDataHub Vendor API**, enabling automated data bundle purchases directly through their service. This provides additional revenue stream and extends your platform capabilities.

---

## 🔑 Integration Details

### API Credentials
- **Base URL:** `https://api.allendatahub.com`
- **API Key:** `adh_2cbe500a9365a43c416dd493ba61d541ed53dd7206045bed`
- **Authentication:** `X-API-Key` header

### Configuration Files
- **Production:** `.env.production`
  ```
  VENDOR_API_KEY=adh_2cbe500a9365a43c416dd493ba61d541ed53dd7206045bed
  VENDOR_API_URL=https://api.allendatahub.com
  ```
- **Development:** `backend/api-server/.env`

---

## 📚 Available Endpoints

### 1. Get Vendor Products
**Endpoint:** `GET /api/vendor/products`

Fetch all available data bundles from AllenDataHub.

**Response:**
```json
{
  "products": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "MTN 1GB Data Bundle",
      "network": "MTN",
      "dataAmount": "1",
      "description": "1GB data bundle for MTN network (valid 30 days)",
      "apiPrice": 2.50
    }
  ]
}
```

### 2. Create Vendor Order
**Endpoint:** `POST /api/vendor/orders`

Purchase a data bundle from vendor (deducts from agent wallet).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "phonenumber": "0541234567",
  "vendorProductId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "order": {
    "id": "65a4c2e8f123456789abcdef",
    "vendorOrderId": "vendor-order-123",
    "status": "pending",
    "vendorStatus": "pending",
    "amount": 2.50,
    "productName": "MTN 1GB Data Bundle",
    "walletBalanceBefore": 100.00,
    "walletBalanceAfter": 97.50,
    "createdAt": "2024-01-15T10:30:45.123Z"
  }
}
```

### 3. Get Vendor Orders
**Endpoint:** `GET /api/vendor/orders`

Retrieve all orders placed with vendor (paginated).

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Items per page

**Response:**
```json
{
  "orders": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "completedCount": 145
}
```

### 4. Get Vendor Order Details
**Endpoint:** `GET /api/vendor/orders/:vendorOrderId`

Get detailed status of a specific vendor order.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "order": {
    "id": "65a4c2e8f123456789abcdef",
    "status": "processing",
    "vendorStatus": "processing",
    "phoneNumber": "0541234567",
    "price": 2.50,
    "productName": "MTN 1GB Data Bundle",
    "webhookHistory": [
      {
        "status": "processing",
        "timestamp": "2024-01-15T10:30:50.000Z",
        "message": "Order sent to vendor"
      }
    ]
  }
}
```

### 5. Vendor Webhook Receiver
**Endpoint:** `POST /api/vendor/webhook`

Receives status updates from AllenDataHub when orders change.

**AllenDataHub Configuration:**
Register this webhook URL in AllenDataHub dashboard:
```
https://api.ewuradatahub.com/api/vendor/webhook
```

**Webhook Payload:**
```json
{
  "event": "order.status_updated",
  "orderId": "vendor-order-123",
  "status": "completed",
  "previousStatus": "processing",
  "timestamp": "2024-01-15T10:34:55.000Z",
  "details": {
    "phoneNumber": "0541234567",
    "productNetwork": "MTN",
    "dataAmount": "1",
    "vendorStatus": "delivered"
  }
}
```

### 6. Vendor Service Status
**Endpoint:** `GET /api/vendor/status`

Check if vendor service is operational.

**Response (Online):**
```json
{
  "status": "online",
  "message": "Vendor service is operational",
  "productsCount": 15
}
```

**Response (Offline):**
```json
{
  "status": "offline",
  "message": "Vendor service not configured"
}
```

---

## 💻 Implementation Examples

### JavaScript Example
```javascript
const API_URL = 'https://api.ewuradatahub.com';

// Get available vendor products
async function getVendorProducts() {
  const response = await fetch(`${API_URL}/api/vendor/products`, {
    method: 'GET',
  });
  return await response.json();
}

// Purchase from vendor
async function purchaseFromVendor(token, productId, phone) {
  const response = await fetch(`${API_URL}/api/vendor/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      vendorProductId: productId,
      phonenumber: phone
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Purchase failed');
  }
  
  return await response.json();
}
```

### Python Example
```python
import requests

API_URL = 'https://api.ewuradatahub.com'

def get_vendor_products():
    """Get available vendor products"""
    response = requests.get(f'{API_URL}/api/vendor/products')
    response.raise_for_status()
    return response.json()['products']

def purchase_from_vendor(token, product_id, phone):
    """Purchase a bundle from vendor"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'vendorProductId': product_id,
        'phonenumber': phone
    }
    
    response = requests.post(
        f'{API_URL}/api/vendor/orders',
        json=payload,
        headers=headers
    )
    
    response.raise_for_status()
    return response.json()
```

---

## 🔄 Order Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ 1. Agent selects vendor product from available list     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Frontend calls POST /api/vendor/orders               │
│    with productId and phone number                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Backend validates input and deducts from wallet      │
│    (Agent must have sufficient balance)                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Backend sends request to AllenDataHub API            │
│    with product ID and phone number                     │
└─────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │ Vendor        │
                    │ Processing    │
                    └───────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Vendor sends webhook to our backend when status      │
│    changes (pending → processing → completed/failed)    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Backend updates order status based on webhook        │
│    Frontend polls or subscribes for real-time updates   │
└─────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security Best Practices

### 1. API Key Protection
- ✅ Store in environment variables only
- ✅ Never expose in frontend code
- ✅ Rotate periodically
- ❌ Never commit to repository

### 2. Phone Number Validation
```javascript
// Valid formats automatically handled:
// - 0541234567 (local format)
// - 541234567 (without 0)
// - +233541234567 (international)
// - 233541234567 (without +)
```

### 3. Wallet Balance Verification
```
User wallet deducted immediately when order created:
  Wallet Before: 100.00 GHS
  Purchase Cost: 2.50 GHS
  Wallet After: 97.50 GHS
```

### 4. Error Handling
```javascript
try {
  const order = await purchaseFromVendor(token, productId, phone);
  // Handle success
} catch (err) {
  if (err.message.includes('Invalid phone')) {
    // Handle validation error
  } else if (err.message.includes('Insufficient balance')) {
    // Handle insufficient funds
  } else {
    // Handle other errors
  }
}
```

---

## 🧪 Testing Checklist

### Pre-Deployment Testing
- [ ] Vendor service status endpoint returns "online"
- [ ] Can fetch vendor products successfully
- [ ] Phone number validation works for all formats
- [ ] Order creation deducts wallet correctly
- [ ] Order tracking works via order details endpoint
- [ ] Error messages are clear and helpful
- [ ] CORS allows vendor requests
- [ ] Rate limiting isn't triggered

### Post-Deployment Testing
- [ ] Test webhook by creating an order
- [ ] Verify webhook updates order status
- [ ] Test different phone number formats
- [ ] Monitor for failed orders
- [ ] Check webhook retry logic
- [ ] Verify logs for all interactions

---

## 📊 Monitoring & Troubleshooting

### Check Vendor Service Health
```bash
curl -X GET https://api.ewuradatahub.com/api/health \
  -H "X-API-Key: adh_2cbe500a9365a43c416dd493ba61d541ed53dd7206045bed"
```

### View Recent Orders
```bash
curl -X GET "https://api.ewuradatahub.com/api/v1/orders?page=1&limit=10" \
  -H "X-API-Key: adh_2cbe500a9365a43c416dd493ba61d541ed53dd7206045bed"
```

### Common Issues

#### Issue: "Vendor service not configured"
- **Cause:** `VENDOR_API_KEY` not set in environment
- **Solution:** Add to `.env` files and restart backend

#### Issue: "Invalid phone number format"
- **Cause:** Phone number in unsupported format
- **Solution:** Use one of: `0XXXXXXXXX`, `XXXXXXXXX`, `+233XXXXXXXXX`

#### Issue: "Insufficient wallet balance"
- **Cause:** Agent doesn't have enough balance
- **Solution:** Agent must fund wallet before purchasing

#### Issue: Orders not updating after purchase
- **Cause:** Webhook not configured in AllenDataHub dashboard
- **Solution:** Register webhook URL: `https://api.ewuradatahub.com/api/vendor/webhook`

---

## 📈 Revenue Model

### Agent Margin
- **Vendor Purchase Price:** 2.50 GHS (example)
- **Retail Price:** 3.50 GHS (agent sets)
- **Agent Profit:** 1.00 GHS per sale

### Wallet Funding
Agents can fund wallet via Paystack for immediate vendor purchases.

---

## 📞 Support

### AllenDataHub Support
- **Email:** support@allendatahub.com
- **Documentation:** https://docs.allendatahub.com
- **Status Page:** https://status.allendatahub.com

### Ewura Hub Wallet Support
- **Documentation:** See other guides in root directory
- **Issue Tracking:** GitHub Issues

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-16 | Initial vendor API integration |

---

**Last Updated:** January 16, 2024
**Integration Status:** ✅ Active
**API Version:** v1
