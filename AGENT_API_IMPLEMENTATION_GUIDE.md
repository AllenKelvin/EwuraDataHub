# AllenDataHub Agent API – Implementation Guide

This guide explains how **agents** can integrate their own websites/apps with **AllenDataHub** so that:

- The agent’s website places an order
- The order is created in AllenDataHub under that agent’s account
- The agent wallet is deducted
- Order status can be tracked/updated

No API subdomain is required for the current deployment. The API lives on the backend host:

- **Base URL**: `https://allen-data-hub-backend.onrender.com`
- **API version**: `/api/v1`

---

## 1) How agents get an API key

### Agent (inside AllenDataHub dashboard)
1. Create an **Agent** account on AllenDataHub
2. Get **verified** by the admin
3. Go to **Profile → Partner API**
4. Click **Request API access**

### Admin (inside AllenDataHub dashboard)
1. Go to **Admin Portal → API access**
2. Set **API prices** per package (optional overrides)
3. Click **Issue API key** (or Regenerate)
4. Copy the key and deliver it securely to the agent

Important:
- API keys are shown **once** at issuance time.
- If lost, the admin should **regenerate** the key.

---

## 2) Authentication

Send the key in the header:

```
X-API-Key: <your_key_here>
```

Example:

```bash
curl -X GET "https://allen-data-hub-backend.onrender.com/api/v1/products" \
  -H "X-API-Key: adh_live_..."
```

---

## 3) Integration flow (agent website → AllenDataHub)

### Typical flow
- **Step A**: Fetch products from AllenDataHub and render them in the agent’s shop UI
- **Step B**: When a customer submits an order, call `POST /api/v1/data/purchase`
- **Step C**: Store the returned `order.id` in the agent’s system
- **Step D**: Poll order status using `GET /api/v1/orders/:orderId` until completed/failed

The order will also appear in the agent’s AllenDataHub dashboard.

---

## 4) Endpoints agents use

### 4.1 List products (with agent API price)

**GET** `/api/v1/products`

**Response**

```json
{
  "products": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "MTN 1GB",
      "network": "MTN",
      "dataAmount": "1GB",
      "description": null,
      "apiPrice": 4.5
    }
  ]
}
```

Notes:
- `apiPrice` is the price that will be deducted from the agent wallet when ordering via API.
- Admin can override `apiPrice` per agent per product.

---

### 4.2 Create an order (deducts wallet)

**POST** `/api/v1/data/purchase`

**Body**

```json
{
  "network": "MTN",
  "volume": 1,
  "phoneNumber": "0541234567",
  "webhookUrl": "https://your.site/api/webhooks/allendatahub"
}
```

Rules:
- `network` must be one of: `MTN`, `Telecel`, `AirtelTigo`
- `volume` must be one of the supported values for that network
- `phoneNumber` is normalized to Ghana format `0XXXXXXXXX`
- `webhookUrl` is optional and may be used for order status callbacks
- Wallet is deducted atomically; if insufficient, the request fails

**Response (201)**

```json
{
  "order": {
    "id": "65a4c2e8f123456789abcdef",
    "userId": "65a4c1eaf123456789abcdea",
    "status": "pending",
    "paymentStatus": "success",
    "price": 4.5,
    "dataAmount": "1GB",
    "phoneNumber": "0541234567",
    "productName": "MTN 1GB",
    "productNetwork": "MTN",
    "orderSource": "api",
    "walletBalanceBefore": 50,
    "walletBalanceAfter": 45.5
  },
  "requestId": "req_..."
}
```

---

### 4.3 List orders (pagination)

**GET** `/api/v1/orders?page=1&limit=20&source=api`

Query:
- `page` default 1
- `limit` default 20 (max 50)
- `source`: `api`, `web`, or `all` (default `api`)

---

### 4.4 Get a single order

**GET** `/api/v1/orders/:orderId`

Use this to poll order status from your own website/app.

---

## 5) Error handling (what to expect)

Common cases:
- **401**: missing/invalid API key
- **403**: agent not verified or access revoked
- **400**: invalid payload / insufficient balance
- **404**: product/order not found

Insufficient balance example:

```json
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "Insufficient wallet balance",
  "required": 9,
  "available": 2,
  "shortfall": 7,
  "suggestion": "Please topup your wallet before placing this order",
  "requestId": "req_..."
}
```

---

## 6) Copy/paste integration examples

### Node.js (Express / Next.js API route)

```js
const BASE_URL = "https://allen-data-hub-backend.onrender.com";
const API_KEY = process.env.ALLENDATAHUB_API_KEY;

export async function createAllenDataHubOrder({ network, volume, phoneNumber }) {
  const resp = await fetch(`${BASE_URL}/api/v1/data/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ network, volume, phoneNumber }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.message || data?.error || "Order failed");
  return data.order;
}
```

### PHP (Laravel / plain PHP)

```php
$base = "https://allen-data-hub-backend.onrender.com";
$apiKey = getenv("ALLENDATAHUB_API_KEY");

$payload = json_encode([
  "network" => $network,
  "volume" => $volume,
  "phoneNumber" => $phoneNumber,
]);

$ch = curl_init("$base/api/v1/data/purchase");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "Content-Type: application/json",
  "X-API-Key: $apiKey",
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

$resp = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status < 200 || $status >= 300) {
  throw new Exception("Order failed: " . $resp);
}

$data = json_decode($resp, true);
$order = $data["order"];
```

---

## 7) Admin controls (pricing + order status)

### Pricing
Admin can set **per-agent, per-product** API prices in:
- **Admin Portal → API access**

If no override is set, the system uses the product’s `agentPrice` (fallback: `price`).

### Order status changes
Admin can update order status in the admin tools (and via backend endpoint):
- `PATCH /api/admin/orders/:id/status` (admin-only, JWT protected)

---

## 8) Security checklist for agents

- Store keys in environment variables (never in frontend code)
- Call AllenDataHub from your backend server (not directly from the browser)
- Log `requestId` + `order.id` for support/debugging

