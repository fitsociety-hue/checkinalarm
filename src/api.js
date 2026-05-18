// Google Apps Script Web App URL
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbzCuhBa6Gq6yrm_WhGM7oBvzpYVluAIAI2JdaO5q_f09JhG0tu49OYpHF7qWLW4mr8P/exec';

export const fetchGAS = (action, payload = {}) => {
  return new Promise((resolve, reject) => {
    // 15초 타임아웃 설정 (구글 로그인 화면으로 리다이렉트되거나 스크립트 오류 시 무한 대기 방지)
    const timeout = setTimeout(() => {
      reject(new Error('서버 응답 시간이 초과되었습니다. (웹 앱 권한 설정이 "모든 사용자"인지 확인해주세요.)'));
    }, 15000);

    const callbackName = 'gas_callback_' + Math.round(100000 * Math.random());
    
    // 글로벌 콜백 함수 정의 (JSONP 방식)
    window[callbackName] = (data) => {
      clearTimeout(timeout);
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    const params = new URLSearchParams();
    params.append('action', action);
    params.append('data', JSON.stringify(payload));
    params.append('callback', callbackName);
    params.append('t', new Date().getTime());

    const script = document.createElement('script');
    script.src = `${GAS_URL}?${params.toString()}`;
    
    // 스크립트 로드 실패 시 에러 처리
    script.onerror = (err) => {
      clearTimeout(timeout);
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('[주소 불일치] 새 배포 URL이 적용되지 않았습니다. Code.gs를 새 배포한 후, 그 URL을 api.js의 GAS_URL에 덮어쓰기 해야 합니다.'));
    };

    document.body.appendChild(script);
  });
};
