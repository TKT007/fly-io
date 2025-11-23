const axios = require('axios');

module.exports = async (req, res) => {
  const TIKTOK_PIXEL_ID = process.env.TIKTOK_PIXEL_ID || 'D4DO8HRC77UCI3HO4RHG';
  const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { event_name, ttclid, user_agent, page_url, referrer_url } = req.body;

    if (!ttclid) {
      return res.status(400).json({ success: false, error: 'ttclid obrigatório' });
    }

    if (!TIKTOK_ACCESS_TOKEN) {
      return res.status(500).json({ success: false, error: 'Token não configurado' });
    }

    const ip_address = req.headers['x-forwarded-for']?.split(',')[0] || '0.0.0.0';
    
    const payload = {
      pixel_code: TIKTOK_PIXEL_ID,
      event: event_name || 'CompleteRegistration',
      timestamp: Math.floor(Date.now() / 1000),
      context: {
        ad: { callback: ttclid },
        page: { url: page_url || '', referrer: referrer_url || '' },
        user: { external_id: '', phone_number: '', email: '' },
        user_agent: user_agent || '',
        ip: ip_address
      },
      properties: {
        content_type: 'product',
        content_id: 'freecash-tiktok-rewards',
        value: 1.00,
        currency: 'USD'
      }
    };

    const response = await axios.post(
      'https://business-api.tiktok.com/open_api/v1.3/pixel/track/',
      payload,
      {
        headers: {
          'Access-Token': TIKTOK_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Conversão registrada',
      tiktok_response: response.data
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
};
