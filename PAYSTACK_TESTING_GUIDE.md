# Testing Paystack Payment & Order Creation

This guide will help you verify that the fixes for order creation and payment handling are working correctly.

## Summary of Fixes

### Fix 1: Order Creation on Paystack Payment
- **Issue**: Orders were not being created after Paystack payment
- **Cause**: Missing `type: "product"` in metadata sent to Paystack
- **Fix**: Added `type: "product"` to metadata in order creation
- **Result**: Backend now correctly identifies product vs wallet fund payments

### Fix 2: Idempotency Check
- **Issue**: Potential duplicate orders if payment verification ran multiple times
- **Cause**: No deduplication check using idempotencyKey
- **Fix**: Added idempotency check before creating orders
- **Result**: Same payment can only create one order

### Fix 3: Better Error Messages
- **Issue**: Unclear error messages when order creation failed
- **Cause**: Generic error responses
- **Fix**: Added specific error messages indicating what failed
- **Result**: Easier debugging when orders don't get created

### Fix 4: 404 After Payment Guidance
- **Issue**: 404 page after Paystack payment
- **Cause**: Paystack dashboard callback URL not configured
- **Fix**: Created comprehensive setup guide
- **Result**: Users know how to properly configure Paystack

## Test Scenarios

### Scenario 1: Product Order via Paystack (Happy Path)

**Prerequisites:**
- User is logged in
- Product exists in database
- Paystack is configured with valid API keys

**Steps:**
1. Go to `/buy-data` page
2. Select a product (e.g., "1GB MTN Data")
3. Enter phone number (e.g., 0551234567)
4. Click "Continue to Cart"
5. In cart, select "Pay with Paystack"
6. Click "Proceed to Payment"
7. Complete payment on Paystack (use test card: 4111 1111 1111 1111)

**Expected Results:**
✅ Payment initialization succeeds
✅ Redirected to Paystack payment page
✅ After payment, redirected to `/paystack-return`
✅ Payment verified successfully
✅ Order is created in database
✅ Vendor order is created (Portal-02)
✅ User sees success message with order details
✅ Can click "Go to Dashboard" or "View Orders"

**Verify in Database:**
```bash
# Check order was created
db.orders.findOne({ 
  paymentReference: "ref_from_paystack"
})

# Should see:
# - status: "processing" or "completed"
# - productId: ObjectId
# - vendorOrderId: (transaction ID from Portal-02)
```

### Scenario 2: Wallet Funding via Paystack (Happy Path)

**Prerequisites:**
- User is logged in
- Paystack configured

**Steps:**
1. Go to `/wallet` page
2. Click "Fund Wallet"
3. Enter amount (e.g., 100)
4. Select "Pay with Paystack"
5. Click "Fund Wallet"
6. Complete payment on Paystack

**Expected Results:**
✅ Payment initialization succeeds
✅ Redirected to Paystack
✅ After payment, redirected to `/paystack-return`
✅ Payment verified
✅ Wallet balance updated
✅ 4% admin fee shown
✅ User sees success message
✅ Can click "Go to Dashboard" or "View Wallet"

**Verify in Database:**
```bash
# Check wallet transaction
db.wallettransactions.findOne({
  reference: "ref_from_paystack"
})

# Check user wallet balance
db.users.findOne({ _id: userId }, { walletBalance: 1 })
```

### Scenario 3: Failed Payment

**Steps:**
1. Go to `/buy-data`
2. Select product
3. Enter phone number
4. Select Paystack payment
5. On Paystack, click "X" or close without completing
6. Return to app

**Expected Results:**
✅ Payment verification shows failed
✅ Clear error message displayed
✅ User can retry or go back to dashboard
✅ No order created

### Scenario 4: Duplicate Payment Handling

**Steps:**
1. Complete Scenario 1 successfully
2. Manually navigate to `/paystack-return?reference=same_reference`

**Expected Results:**
✅ Payment verification succeeds (using existing reference)
✅ Same order returned (not duplicated)
✅ Success message shown

**Verify in Database:**
```bash
# Check only one order for this reference
db.orders.countDocuments({ 
  paymentReference: "ref_from_paystack"
})
# Should return: 1
```

### Scenario 5: Missing Product

**Setup:**
1. Create an order with invalid/deleted product ID
2. Simulate payment verification

**Expected Results:**
✅ Payment verified successfully
✅ User sees message: "Payment verified but product not found in system"
✅ No order created
✅ Payment marked as processed

### Scenario 6: Missing Metadata

**Setup:**
1. Manually send payment to Paystack without proper metadata
2. Complete payment

**Expected Results:**
✅ Payment verification detects missing fields
✅ User sees: "Payment verified but order creation failed: missing required fields"
✅ No order created

## Checking Backend Logs

After running tests, check backend logs for proper logging:

```bash
# Look for order creation logs
[terminal] grep "✅ Payment verification: Order created" logs.txt

# Look for wallet fund logs
[terminal] grep "✅ Payment verification: Wallet fund successful" logs.txt

# Look for Portal-02 vendor calls
[terminal] grep "✅ Payment verification: Portal-02 order created" logs.txt

# Look for errors
[terminal] grep "❌ Payment verification" logs.txt
```

Expected log messages:
- `Payment verification: Creating order from Paystack metadata`
- `✅ Payment verification: Order created successfully`
- `✅ Payment verification: Portal-02 order created successfully`
- `Payment verification: Order {order_id} payment confirmed, processing...`

## API Endpoints to Test

### Test Payment Verification Directly
```bash
# Get reference from Paystack first
REFERENCE="ref_xxxxx"

# Verify payment
curl -X GET "http://localhost:8080/api/payments/verify/$REFERENCE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "status": "success",
#   "message": "Payment verified",
#   "order": {
#     "id": "...",
#     "status": "processing",
#     "productName": "1GB MTN",
#     "amount": 1000,
#     ...
#   }
# }
```

### Get Orders to Verify Creation
```bash
curl -X GET "http://localhost:8080/api/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Check that new order appears in list
```

## Troubleshooting Test Failures

### Order Not Created
1. ✓ Check that metadata includes `type: "product"` in logs
2. ✓ Check that productId exists in database: `db.products.findOne({ _id: ObjectId(...) })`
3. ✓ Check phone number is valid
4. ✓ Check order creation logs for errors

### Order Created But Vendor Call Failed
1. ✓ Check Portal-02 API logs
2. ✓ Check phone number is valid and formatted correctly
3. ✓ Check vendor API key is configured
4. ✓ Check network connectivity to Portal-02

### Payment Verification Fails
1. ✓ Check Paystack API key is valid
2. ✓ Check payment reference is correct
3. ✓ Check user is authenticated
4. ✓ Check backend logs for specific error

### User Sees 404 After Payment
1. ✓ Verify Paystack callback URL is configured (see PAYSTACK_CALLBACK_URL_SETUP.md)
2. ✓ Check domain is accessible from internet
3. ✓ Try navigating to `/paystack-return` manually with reference parameter
4. ✓ Check browser console for JavaScript errors

## Performance Considerations

After fixes, verify:
- ✓ Order creation completes within 2 seconds
- ✓ Vendor API call completes within 5 seconds total
- ✓ No performance degradation with idempotency checks
- ✓ Database indexes on paymentReference and idempotencyKey

## Security Checks

After fixing, verify:
- ✓ User can only see their own orders
- ✓ Orders can't be modified after creation (except status)
- ✓ Idempotency prevents fraud through duplicate payments
- ✓ Paystack webhook signature verification still works
- ✓ Admin fee is correctly calculated and charged

## Checklist for Production Deployment

Before deploying to production:

- [ ] All tests pass locally
- [ ] Paystack callback URL configured in production dashboard
- [ ] PAYSTACK_SECRET_KEY is correct for production environment
- [ ] Database backups taken
- [ ] Monitor backend logs for first 24 hours
- [ ] Test with real card numbers (use Paystack sandbox first)
- [ ] Verify Portal-02 API connection
- [ ] Check SSL certificate on domain
- [ ] Rate limiting configured on payment endpoints
- [ ] Error monitoring (Sentry/similar) configured

## Rollback Plan

If issues occur after deployment:

1. Check logs for specific errors
2. If webhook missing: manually verify recent payments with `/verify/{reference}`
3. If orders not creating: check product IDs are valid
4. If vendor calls failing: check Portal-02 API status
5. If mass duplicates: contact support, database cleanup may be needed

## Need Help?

If tests fail:
1. Check backend logs with specific error messages
2. Check frontend network tab for API responses
3. Verify database state with queries above
4. Contact support with:
   - Error message
   - Reference number
   - Backend log excerpt
   - Product/Paystack details
