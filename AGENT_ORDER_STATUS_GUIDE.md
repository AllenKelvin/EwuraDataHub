# Agent API Order Status Guide

This document explains how an AllenDataHub agent can pull order status from the API and keep their own system updated.

## Summary

Agents have two supported ways to sync order status:

1. Poll AllenDataHub directly using the partner API.
2. Receive real-time updates by providing a webhook URL when placing an order.

> Agents can read order status from AllenDataHub. They cannot use the public agent API to change AllenDataHub's internal order status directly.

---

## 1) Pull order status from AllenDataHub

### List orders

Endpoint:

```http
GET /api/v1/orders?page=1&limit=20
x-api-key: <AGENT_API_KEY>
```

Example response:

```json
{
  "orders": [
    {
      "id": "65123456789abcdef0123456",
      "status": "processing",
      "paymentStatus": "success",
      "phoneNumber": "0241234567",
      "productName": "MTN 1 GB",
      "vendorOrderId": "external-12345",
      "clientOrderReference": "API-agentid-1685000000000-abcdef"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  },
  "completedCount": 0
}
```

### Get one order by ID

Endpoint:

```http
GET /api/v1/orders/:orderId
x-api-key: <AGENT_API_KEY>
```

Example response:

```json
{
  "id": "65123456789abcdef0123456",
  "userId": "agentuserid",
  "productId": "69815ba90771ff415dd64020",
  "price": 4.2,
  "dataAmount": "1 GB",
  "status": "completed",
  "paymentStatus": "success",
  "phoneNumber": "0241234567",
  "productName": "MTN 1 GB",
  "vendorOrderId": "external-12345",
  "clientOrderReference": "API-agentid-1685000000000-abcdef",
  "webhookUrl": "https://agent.example.com/api/webhooks/allendatahub"
}
```

### Recommended polling pattern

- Poll every 10–30 seconds for orders that are still in `pending` or `processing`.
- Stop polling once the order reaches `completed` or `failed`.
- Match the order using `orderId`, `clientOrderReference`, or `vendorOrderId`.

---

## 2) Receive real-time status updates via webhook

### Create an order with a webhook URL

Endpoint:

```http
POST /api/v1/data/purchase
Content-Type: application/json
x-api-key: <AGENT_API_KEY>
```

Example body:

```json
{
  "phoneNumber": "0241234567",
  "network": "MTN",
  "volume": 1,
  "webhookUrl": "https://agent.example.com/api/webhooks/allendatahub"
}
```

### What AllenDataHub sends to your webhook

AllenDataHub will send a `POST` request to your webhook with a payload like this:

```json
{
  "orderId": "65123456789abcdef0123456",
  "vendorOrderId": "external-12345",
  "clientOrderReference": "API-agentid-1685000000000-abcdef",
  "reference": "API-agentid-1685000000000-abcdef",
  "status": "completed",
  "vendorStatus": "delivered",
  "phoneNumber": "0241234567",
  "dataAmount": "1 GB",
  "webhookEvent": "order.status.updated",
  "timestamp": "2026-05-26T12:00:00.000Z"
}
```

### What your webhook handler should do

Your server should:

1. Accept the `POST` request.
2. Read the payload.
3. Find the matching local order record.
4. Update your internal order status.
5. Return HTTP `200`.

Example Node.js / Express receiver:

```js
const express = require("express");
const app = express();
app.use(express.json());

app.post("/api/webhooks/allendatahub", (req, res) => {
  const payload = req.body;
  console.log("AllenDataHub status update", payload);

  // Update your internal order record here.
  // Example:
  // await Order.findOneAndUpdate({ reference: payload.reference }, { status: payload.status });

  res.sendStatus(200);
});
```

---

## 3) How to update your own order status

Agents should update their own order records in their own database or ERP system using one of these flows:

- Use webhook updates for near real-time sync.
- Use polling when webhooks are unavailable or fail.

### Recommended logic

```text
If webhook arrives -> update local order record immediately.
Else if polling -> read /api/v1/orders/:orderId and update local record.
```

### Suggested local status mapping

```text
AllenDataHub status: pending -> your local status: pending
AllenDataHub status: processing -> your local status: processing
AllenDataHub status: completed -> your local status: completed
AllenDataHub status: failed -> your local status: failed
```

---

## 4) Important limitation

The public agent API supports reading order state and receiving webhook notifications. It does not provide a public endpoint for agents to directly change the status of an order inside AllenDataHub.

If an agent needs to change a status inside AllenDataHub, that must be handled through the admin-side backend workflow.

---

## 5) Best practice

For a robust integration:

- Always send `webhookUrl` when creating orders.
- Treat webhook delivery as the primary real-time path.
- Use polling as a fallback.
- Match orders using `orderId`, `clientOrderReference`, or `vendorOrderId`.
- Store the returned `reference` or `clientOrderReference` in your own order record.
