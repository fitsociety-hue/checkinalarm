// Google Apps Script Web App URL
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbzqu4zzWPR6yJ_qI1M64R1tgdP7G5pI06upLFlgQmq5jWE2MU8d7Ks9lC_3M_wdLiEt/exec';

/**
 * Sends a request to Google Apps Script Backend
 * Using POST with text/plain to avoid CORS preflight issues
 */
export const fetchGAS = async (action, payload = {}) => {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, ...payload }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('GAS API Error:', error);
    throw error;
  }
};
