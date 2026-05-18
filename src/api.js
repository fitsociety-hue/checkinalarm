// Google Apps Script Web App URL
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbzqu4zzWPR6yJ_qI1M64R1tgdP7G5pI06upLFlgQmq5jWE2MU8d7Ks9lC_3M_wdLiEt/exec';

/**
 * Sends a request to Google Apps Script Backend
 * Using POST with text/plain to avoid CORS preflight issues
 */
export const fetchGAS = async (action, payload = {}) => {
  try {
    // GET 요청을 사용하여 CORS 및 프리플라이트(Preflight) 이슈를 원천 차단합니다.
    const params = new URLSearchParams();
    params.append('action', action);
    params.append('data', JSON.stringify(payload));
    
    // 타임스탬프를 추가하여 캐싱을 방지합니다.
    params.append('t', new Date().getTime());

    const url = `${GAS_URL}?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('GAS API Error:', error);
    throw error;
  }
};
