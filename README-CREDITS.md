# Credit System Documentation

## Overview

This document describes the credit system implementation for the document assistant application. The system manages user credits for API usage, including daily limits, transactions, and subscription management.

## Features

- **Credit Balance Management**: Track user credit balances and daily usage
- **Daily Reset**: Automatic daily reset of usage counters
- **Transaction History**: Complete audit trail of all credit transactions
- **Credit Packages**: Purchasable credit top-ups
- **Subscription Plans**: Recurring credit plans with daily bonuses
- **API Integration**: Credit consumption across all chat endpoints

## Database Schema

### UserCredit
- `balance`: Current available credits
- `dailyLimit`: Maximum daily credits (for free users)
- `dailyUsed`: Credits used today
- `totalEarned`: Lifetime credits earned
- `totalSpent`: Lifetime credits spent
- `lastResetDate`: Last daily reset timestamp

### CreditTransaction
- `type`: Transaction type (purchase, consumption, reset, daily_bonus)
- `amount`: Credit amount (positive for additions, negative for consumption)
- `description`: Human-readable description
- `reference`: External reference (order ID, etc.)

### CreditPackage
- `name`: Package name
- `credits`: Number of credits in package
- `price`: Price in cents
- `currency`: Currency code (USD, EUR, etc.)

### SubscriptionPlan
- `name`: Plan name
- `dailyCredits`: Daily credit allowance
- `monthlyCredits`: Monthly credit bonus
- `price`: Monthly price in cents

## API Endpoints

### Credit Management
- `GET /api/credits` - Get user credit balance
- `POST /api/credits` - Consume credits
- `GET /api/credits/transactions` - Get transaction history
- `POST /api/credits/topup` - Purchase credit package
- `POST /api/credits/reset` - Trigger daily reset (admin/cron)

### Packages & Subscriptions
- `GET /api/credits/packages` - List available packages
- `POST /api/credits/packages` - Create new package (admin)
- `GET /api/subscriptions` - List plans and user subscription
- `POST /api/subscriptions` - Subscribe to plan

## Daily Reset System

### Automatic Reset
The system automatically resets daily usage counters and adds subscription bonuses:

1. **Usage Reset**: `dailyUsed` counter reset to 0
2. **Subscription Bonuses**: Daily credits added for active subscribers
3. **Transaction Logging**: All resets logged for audit trail

### Implementation Methods

#### 1. API-based Reset
```bash
# Manual trigger via API
curl -X POST "http://localhost:3001/api/credits/reset?key=YOUR_API_KEY"
```

#### 2. Cron Job Script
```bash
# Add to crontab for daily execution at midnight
0 0 * * * cd /path/to/app && node scripts/daily-reset.js

# Or run manually
node scripts/daily-reset.js
```

#### 3. Integrated Reset
The system automatically checks and resets credits when users access the API.

## Usage Examples

### Check Credit Balance
```javascript
const response = await fetch('/api/credits');
const { balance, dailyLimit, dailyUsed } = await response.json();
```

### Consume Credits
```javascript
const response = await fetch('/api/credits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 1, description: 'Chat message' })
});
```

### Purchase Credits
```javascript
const response = await fetch('/api/credits/topup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    packageId: 'starter-pack',
    paymentMethod: 'stripe_token_here'
  })
});
```

## Configuration

### Environment Variables
```env
# Cron job security
CRON_API_KEY=your-secure-api-key

# Stripe integration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Default credit settings
DEFAULT_DAILY_CREDITS=500
DEFAULT_CREDIT_LIMIT=1000
```

### Credit Packages (Seeded)
- **Starter Pack**: 1,000 credits - $9.99
- **Popular Pack**: 5,000 credits - $39.99
- **Power Pack**: 15,000 credits - $99.99
- **Enterprise Pack**: 50,000 credits - $299.99

### Subscription Plans (Seeded)
- **Basic Plan**: 50 daily credits - $9.99/month
- **Pro Plan**: 200 daily credits - $29.99/month
- **Enterprise Plan**: 1,000 daily credits - $99.99/month

## Security Considerations

1. **API Protection**: Credit endpoints require authentication
2. **Rate Limiting**: Prevent abuse of credit consumption
3. **Transaction Integrity**: All credit changes are logged
4. **Cron Security**: API key protection for reset endpoints
5. **Payment Security**: Stripe integration for secure payments

## Monitoring & Analytics

### Key Metrics
- Daily active users with credit consumption
- Average credits per user per day
- Credit package conversion rates
- Subscription retention rates
- Daily reset success rates

### Logging
- All credit transactions are logged with timestamps
- Daily reset operations are logged with success/failure status
- Error handling with detailed error messages

## Troubleshooting

### Common Issues

1. **Credits Not Resetting**
   - Check cron job configuration
   - Verify API key for reset endpoint
   - Check database connectivity

2. **Negative Credit Balance**
   - Review transaction history
   - Check for concurrent request issues
   - Verify credit consumption logic

3. **Payment Integration Issues**
   - Verify Stripe configuration
   - Check webhook endpoints
   - Review payment processing logs

### Debug Commands
```bash
# Check reset status
curl http://localhost:3001/api/credits/reset

# View user transactions
curl http://localhost:3001/api/credits/transactions

# Manual reset (with API key)
curl -X POST "http://localhost:3001/api/credits/reset?key=YOUR_API_KEY"
```

## Future Enhancements

1. **Advanced Analytics**: Usage patterns and predictions
2. **Credit Sharing**: Team/organization credit pools
3. **Dynamic Pricing**: Usage-based pricing tiers
4. **Referral System**: Credit rewards for referrals
5. **API Rate Limiting**: Credit-based rate limiting
6. **Mobile App**: Credit management on mobile devices