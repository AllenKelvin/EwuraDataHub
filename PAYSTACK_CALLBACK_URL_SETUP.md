# Paystack Callback URL Configuration Guide

## Overview
After users complete payment on Paystack, they need to be redirected back to your application. This guide explains how to configure the callback URL in your Paystack dashboard.

## ⚠️ Important: Why Configuration is Needed
- **Without callback URL setup**: Users will get a 404 error or be stranded on Paystack after payment
- **With callback URL setup**: Users are automatically redirected to your app's payment verification page
- **Callback URL tells Paystack where to send users** after successful payment

## Step 1: Access Paystack Dashboard

1. Go to [https://dashboard.paystack.com](https://dashboard.paystack.com)
2. Log in with your Paystack account credentials
3. Click on **Settings** (usually in the top right menu)

## Step 2: Find Callback URL Settings

1. In Settings, look for **API Keys & Webhooks** or **Developers** section
2. Look for a section called:
   - "Callback URL" or
   - "Return URL" or  
   - "Redirect URL" or
   - "Payment Settings"

## Step 3: Configure the Callback URL

Set the callback URL based on your environment:

### For Production (Live Environment)
```
https://allendatahub.com/paystack-return
```

### For Development/Testing (Local)
```
http://localhost:5173/paystack-return
```

### For Staging
```
https://your-staging-domain.com/paystack-return
```

## Step 4: Save Settings

1. Enter the appropriate callback URL for your environment
2. Click **Save** or **Update**
3. You should see a confirmation message

## Verification

After setting the callback URL:

1. Test a payment in your environment
2. Complete the payment on Paystack
3. You should be redirected back to your app (NOT get a 404)
4. You should see either:
   - ✅ Payment Successful page (if payment was verified)
   - ❌ Payment Failed page (if payment was not successful)

## How the Callback Flow Works

```
1. User clicks "Pay Now" in your app
2. Redirected to Paystack payment page
3. User enters card details and completes payment
4. Paystack verifies payment
5. Paystack redirects user to your callback URL: {callback-url}?reference={PAYMENT_REF}
6. Your app's /paystack-return page loads
7. Page extracts reference from URL
8. Page calls backend to verify payment
9. Order is created/wallet is funded
10. User sees success/failure message with options to go to dashboard or orders
```

## Troubleshooting

### Issue: Still getting 404 after payment
- ✓ Verify callback URL is correctly set in Paystack dashboard
- ✓ Check that the domain in callback URL is accessible from the internet
- ✓ Ensure the URL includes the full path: `/paystack-return`
- ✓ If using custom domains, make sure DNS is correctly pointing to your server

### Issue: Payment is verified but order not created
- This is likely a backend issue, not a callback URL issue
- Check backend logs at `/api/payments/verify/{reference}`
- Ensure product exists in database
- Ensure metadata was correctly sent to Paystack

### Issue: Callback URL works but user sees blank page
- Check browser console for JavaScript errors
- Verify token is properly stored in localStorage
- Check that user is properly authenticated
- Look at network tab to see if API calls are succeeding

## Return Page Features

The `/paystack-return` page includes:

✅ **Automatic Payment Verification**
- Uses reference parameter from Paystack
- Calls backend to verify payment status

✅ **Clear Status Messages**
- Shows loading state while verifying
- Displays success/failure with details
- Shows wallet update or order confirmation

✅ **Easy Navigation**
- "Go to Dashboard" button for quick access
- "View Orders" or "View Wallet" button depending on transaction type
- "Try Another Payment" option if payment failed

✅ **Error Handling**
- Shows specific error messages
- Provides support contact information
- Handles missing references gracefully

## Testing Callback URL

To test if your callback URL is reachable:

```bash
# Test if the callback URL is accessible
curl -I https://allendatahub.com/paystack-return?reference=test_ref

# Expected response: 200 OK (or redirect)
```

## Multiple Environments

If you have multiple environments (development, staging, production):

### Option 1: Create Multiple Paystack Projects
- Create separate Paystack projects for each environment
- Use different API keys for each
- Configure callback URL specific to each

### Option 2: Use Parameterized Callback
- Paystack will redirect to: `{callback-url}?reference={reference}`
- Your app can determine the environment from request headers
- Use same callback URL for all environments

## Important Security Notes

⚠️ **HTTPS Required for Production**
- Paystack only redirects to HTTPS URLs in production
- HTTP is only allowed for localhost/development
- Ensure your domain has valid SSL certificate

⚠️ **Verify Webhook Signature**
- Always verify Paystack webhook signatures (backend does this)
- Never trust payment status solely from redirect parameters
- Backend verification is the source of truth

⚠️ **Don't Rely Solely on Callback**
- Network issues could prevent callback redirect
- Always check payment status via webhook or API polling
- Callback is a user experience feature, not a reliable data source

## Reference Documentation

- [Paystack API Documentation](https://paystack.com/docs/api/)
- [Paystack Webhook Guide](https://paystack.com/docs/payments/webhooks/)
- [Paystack Integration Tutorial](https://paystack.com/docs/payments/payment-channels/mobile/mobile-web-checkout/)

## Need Help?

If the callback URL is still not working:

1. ✓ Double-check the URL has no typos
2. ✓ Verify domain is accessible from the internet
3. ✓ Check that path is `/paystack-return` (not `/payment-callback` or other variations)
4. ✓ Clear browser cache and try again
5. ✓ Contact Paystack support at support@paystack.com
6. ✓ Contact us at support@allendatahub.com with:
   - Paystack dashboard screenshot showing callback URL
   - Browser network tab screenshot showing requests
   - Error message you're seeing
