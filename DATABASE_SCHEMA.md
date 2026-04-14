# ✅ Database Package Schema - Complete Setup

## Database Collections Setup

### 4 MongoDB Collections:
1. **Users** - User accounts with roles, wallet balance, verification status
2. **Orders** - Order history with payment methods and status tracking
3. **Packages** - All data bundles/airtime packages with pricing
4. **WalletTransactions** - Wallet credit/debit transaction history

---

## Package Schema Structure

### Database Fields:
```typescript
{
  _id: ObjectId                      // MongoDB ID
  id: string (unique)                // Package identifier (e.g., "mtn-data-1gb")
  network: string                    // "MTN" | "Telecel" | "AirtelTigo"
  type: string                       // "airtime" | "data"
  name: string                       // Display name (e.g., "1GB / 7 Days")
  description: string                // Detailed description
  userPrice: number                  // Price for regular users
  agentPrice: number                 // Price for agents (discounted)
  value: string                      // Package value (e.g., "1GB")
  createdAt: Date                    // Timestamp
  updatedAt: Date                    // Timestamp
}
```

### Example Package:
```json
{
  "id": "mtn-data-1gb",
  "network": "MTN",
  "type": "data",
  "name": "1GB / 7 Days",
  "description": "MTN 1GB Data — 7 days validity",
  "userPrice": 4.20,
  "agentPrice": 3.80,
  "value": "1GB"
}
```

---

## Seeded Packages (40 Total)

### MTN (14 packages)
- **Airtime**: GHS 1, 2, 5, 10, 20, 50
- **Data**: 100MB, 500MB, 1GB, 2GB, 3GB, 5GB, 10GB, 20GB

### Telecel (14 packages)
- **Airtime**: GHS 1, 2, 5, 10, 20, 50
- **Data**: 100MB, 500MB, 1GB, 2GB, 3GB, 5GB, 10GB

### AirtelTigo (12 packages)
- **Airtime**: GHS 1, 2, 5, 10, 20, 50
- **Data**: 100MB, 500MB, 1GB, 2GB, 3GB, 5GB, 10GB

---

## Frontend Integration

### API Endpoints:
```bash
# Get all packages
GET /api/products

# Get packages by network
GET /api/products?network=MTN

# Get packages by type (data/airtime)
GET /api/products?type=data

# Combined filters
GET /api/products?network=MTN&type=data
```

### Frontend Display:
- **Buy Data page** filters to show only data packages
- Shows both **user prices** and **agent prices**
- User role determines which price is displayed
- Prices update based on user role at checkout

---

## Current Status

✅ **Backend**: Port 8080 - Connected to MongoDB
✅ **Database**: 40 packages seeded with user/agent prices
✅ **Frontend**: Port 5174 - Displaying packages from API
✅ **TypeScript**: All types validated

---

## How It Works

1. **User Selects Network** → MTN/Telecel/AirtelTigo
2. **Frontend Fetches Data** → API filters by network & type=data
3. **Database Returns Packages** → With both user/agent prices
4. **Frontend Displays Options** → Shows appropriate price based on user role
5. **User Adds to Cart** → Price stored with order

---

## Important Notes

- **Agent Prices**: 8-10% discount from user prices
- **Database-Driven**: All packages in MongoDB (not hardcoded)
- **Real-time**: Changes to prices in database immediately reflect in frontend
- **Filtering**: API efficiently queries using MongoDB indexes on network+type
