import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { fetchGAS } from '../api';

export default function Login() {
  const [loginType, setLoginType] = useState('employee'); // 'employee' or 'admin'
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [pin, setPin] = useState('');
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loginType === 'employee' && (!name || !team || pin.length !== 4)) {
      setError('이름, 팀명, 4자리 비밀번호를 정확히 입력해주세요.');
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
        data = await fetchGAS('login', { name, team, pin });
      }

      if (data.success) {
        if (loginType === 'admin') {
          login({ name: '관리자', team: '운영지원팀', role: 'admin', adminId });
        } else {
          login({ name, team, pin, role: data.role || 'employee' });
        }
        navigate('/dashboard');
      } else {
        setError(data.message || '로그인/회원가입에 실패했습니다.');
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
        <h2 style={{ textAlign: 'center', marginBottom: '8px', color: 'var(--primary-color)' }}>
          강동어울림복지관
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '32px', color: 'var(--text-muted)' }}>
          직원 식당 체크인 시스템
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
            gap: '10px'
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="tabs" style={{ marginBottom: '24px' }}>
          <button 
            className={`tab ${loginType === 'employee' ? 'active' : ''}`}
            onClick={() => setLoginType('employee')}
            style={{ padding: '8px' }}
          >
            일반 직원
          </button>
          <button 
            className={`tab ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => setLoginType('admin')}
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
                  placeholder="전략기획팀"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="label" htmlFor="pin">비밀번호 (숫자 4자리)</label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="input-field"
                  placeholder="0000"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
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
            style={{ width: '100%', padding: '14px' }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <div className="loader" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                <span>연결 중... 잠시만 기다려 주세요</span>
              </span>
            ) : (
              <>
                <LogIn size={18} />
                <span>시작하기</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
