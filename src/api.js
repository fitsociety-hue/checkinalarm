// Google Apps Script Web App URL
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbwBlgRPeb85ar4pDHlPK-Xz9oJ3TCZJDeukz75CvBhE_fPLI2TY-ib58lvaMjNjCXVd/exec';

/**
 * GAS와 통신하는 함수.
 * 1차: fetch (PC/모바일 Chrome 모두 지원, GAS가 CORS 허용 시 동작)
 * 2차: JSONP 폴백 (fetch 실패 시 자동 전환)
 * 어느 환경에서도 동작하도록 이중 전략을 사용합니다.
 */
export const fetchGAS = (action, payload = {}) => {
  const params = new URLSearchParams();
  params.append('action', action);
  params.append('data', JSON.stringify(payload));
  params.append('t', new Date().getTime());

  const url = `${GAS_URL}?${params.toString()}`;

  // --- 1차 시도: fetch (redirect: 'follow') ---
  // GAS Web App은 "모든 사용자"로 배포 시 fetch도 허용합니다.
  return fetch(url, {
    method: 'GET',
    redirect: 'follow',
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .catch(() => {
      // --- 2차 시도: JSONP 폴백 (fetch가 막힌 환경 대비) ---
      return jsonpFetch(url);
    });
};

/**
 * JSONP 방식 통신 (구형 브라우저 / fetch CORS 차단 환경용 폴백)
 */
function jsonpFetch(baseUrl) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('서버 응답 시간이 초과되었습니다.\n잠시 후 다시 시도해 주세요.'));
    }, 20000);

    const callbackName = 'gas_cb_' + Math.round(1e8 * Math.random());

    const cleanup = () => {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement('script');
    script.src = `${baseUrl}&callback=${callbackName}`;

    script.onerror = () => {
      cleanup();
      reject(new Error('서버와 통신할 수 없습니다.\n네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요.'));
    };

    document.head.appendChild(script);
  });
}
