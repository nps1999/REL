const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const BASE_URL = PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  
  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
  
  const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  
  const data = await response.json();
  return data.access_token;
}

export async function createPayPalOrder(amount, currency = 'USD', orderId) {
  const accessToken = await getPayPalAccessToken();
  
  const response = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderId,
        amount: {
          currency_code: currency,
          value: parseFloat(amount).toFixed(2),
        },
      }],
    }),
  });
  
  return await response.json();
}

export async function capturePayPalOrder(paypalOrderId) {
  const accessToken = await getPayPalAccessToken();
  
  const response = await fetch(`${BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  return await response.json();
}
