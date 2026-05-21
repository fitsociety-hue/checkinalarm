import { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { fetchGAS } from '../api';

export default function Login() {
  const [loginType, setLoginType] = useState('employee'); // 'employee' or 'admin'
  const [isSignup, setIsSignup] = useState(false); // true: Signup mode, false: Login mode
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [pinCells, setPinCells] = useState(['', '', '', '']);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Create Refs for the 4 individual PIN input boxes
  const pinRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  const handlePinChange = (index, value) => {
    // Only allow numeric input
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue) {
      const newCells = [...pinCells];
      newCells[index] = '';
      setPinCells(newCells);
      return;
    }

    // Take the last digit
    const char = cleanValue[cleanValue.length - 1];
    const newCells = [...pinCells];
    newCells[index] = char;
    setPinCells(newCells);

    // Auto focus next box
    if (index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!pinCells[index]) {
        // If current box is empty, focus previous and clear it
        if (index > 0) {
          const newCells = [...pinCells];
          newCells[index - 1] = '';
          setPinCells(newCells);
          pinRefs[index - 1].current?.focus();
        }
      } else {
        // If current box has value, clear it
        const newCells = [...pinCells];
        newCells[index] = '';
        setPinCells(newCells);
      }
      e.preventDefault();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (pasteData) {
      const newCells = [...pinCells];
      for (let i = 0; i < 4; i++) {
        newCells[i] = pasteData[i] || '';
      }
      setPinCells(newCells);

      // Focus best target box
      const lastIndex = Math.min(pasteData.length - 1, 3);
      if (lastIndex >= 0) {
        const focusIndex = lastIndex === 3 ? 3 : lastIndex + 1;
        pinRefs[focusIndex].current?.focus();
      }
    }
  };

  const clearPin = () => {
    setPinCells(['', '', '', '']);
    setTimeout(() => {
      pinRefs[0].current?.focus();
    }, 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pinString = pinCells.join('');

    if (loginType === 'employee' && (!name || !team || pinString.length !== 4)) {
      setError('이름, 소속 팀명, 4자리 비밀번호를 정확히 입력해주세요.');
      return;
    }
    if (loginType === 'admin' && (!adminId || !adminPassword)) {
      setError('관리자 아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let data;
      if (loginType === 'admin') {
        data = await fetchGAS('adminLogin', { adminId, adminPassword });
      } else {
        if (isSignup) {
          data = await fetchGAS('signup', { name, team, pin: pinString });
        } else {
          data = await fetchGAS('login', { name, team, pin: pinString });
        }
      }

      if (data.success) {
        if (loginType === 'admin') {
          login({ name: '관리자', team: '운영지원팀', role: 'admin', adminId });
          navigate('/dashboard');
        } else {
          if (isSignup) {
            // After successful signup, switch to login view and show success message
            setIsSignup(false);
            clearPin();
            alert('회원가입이 완료되었습니다. 설정하신 비밀번호로 로그인해 주세요!');
          } else {
            login({ name, team, pin: pinString, role: data.role || 'employee' });
            navigate('/dashboard');
          }
        }
      } else {
        setError(data.message || '요청 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('초과') || msg.includes('timeout')) {
        setError('서버 응답이 너무 늦습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        setError('서버와 연결할 수 없습니다.\n네트워크(Wi-Fi 또는 데이터) 상태를 확인하고 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        {/* Premium Brand Header Area */}
        <div className="auth-brand-header">
          <div className="auth-brand-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <div className="auth-brand-text">
            <h1>식수 인원 체크</h1>
            <p>강동어울림복지관</p>
          </div>
        </div>


        {/* Dynamic Titles */}
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '6px' }}>
          {loginType === 'admin' ? '관리자 로그인' : (isSignup ? '회원가입' : '로그인')}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          {loginType === 'admin' 
            ? '시스템 관리 권한으로 로그인하세요' 
            : (isSignup ? '신규 계정을 등록하고 시작하세요' : '등록된 계정으로 로그인하세요')}
        </p>

        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            padding: '14px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre-line',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            border: '1px solid #FCA5A5'
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="tabs" style={{ marginBottom: '24px' }}>
          <button 
            type="button"
            className={`tab ${loginType === 'employee' ? 'active' : ''}`}
            onClick={() => {
              setLoginType('employee');
              setIsSignup(false);
              setError('');
              clearPin();
            }}
            style={{ padding: '8px' }}
          >
            일반 직원
          </button>
          <button 
            type="button"
            className={`tab ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setLoginType('admin');
              setIsSignup(false);
              setError('');
              clearPin();
            }}
            style={{ padding: '8px' }}
          >
            관리자
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {loginType === 'employee' ? (
            <>
              <div className="form-group">
                <label className="label" htmlFor="name">이름</label>
                <input
                  id="name"
                  type="text"
                  className="input-field"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="team">소속 팀명</label>
                <input
                  id="team"
                  type="text"
                  className="input-field"
                  placeholder="복지팀"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  required
                />
              </div>

              {/* 4-digit PIN input with beautiful independent boxes */}
              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="label">비밀번호 (숫자 4자리)</label>
                <div className="pin-container">
                  {[0, 1, 2, 3].map((index) => (
                    <input
                      key={index}
                      ref={pinRefs[index]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      pattern="[0-9]*"
                      className="pin-box"
                      value={pinCells[index]}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      onPaste={handlePinPaste}
                      required
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="label" htmlFor="adminId">관리자 아이디</label>
                <input
                  id="adminId"
                  type="text"
                  className="input-field"
                  placeholder="admin"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="label" htmlFor="adminPassword">관리자 비밀번호</label>
                <input
                  id="adminPassword"
                  type="password"
                  className="input-field"
                  placeholder="비밀번호 입력"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <div className="loader" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                <span>연결 중... 잠시만 기다려 주세요</span>
              </span>
            ) : (
              <>
                {loginType === 'admin' ? (
                  <>
                    <LogIn size={18} />
                    <span>관리자 로그인</span>
                  </>
                ) : (
                  <>
                    {isSignup ? <UserPlus size={18} /> : <LogIn size={18} />}
                    <span>{isSignup ? '회원가입 완료' : '로그인'}</span>
                  </>
                )}
              </>
            )}
          </button>
        </form>

        {/* Separated Sign-up <-> Login Switch footer links */}
        {loginType === 'employee' && (
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
            {isSignup ? (
              <span style={{ color: 'var(--text-muted)' }}>
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(false);
                    setError('');
                    clearPin();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    fontSize: '14px'
                  }}
                >
                  로그인
                </button>
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>
                계정이 없으신가요?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(true);
                    setError('');
                    clearPin();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    fontSize: '14px'
                  }}
                >
                  회원가입
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

