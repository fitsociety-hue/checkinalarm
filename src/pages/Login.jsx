import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { fetchGAS } from '../api';

export default function Login() {
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !team || pin.length !== 4) {
      setError('이름, 팀명, 4자리 비밀번호를 정확히 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchGAS('login', { name, team, pin });

      if (data.success) {
        login({ name, team, pin, role: data.role || 'employee' });
        navigate('/dashboard');
      } else {
        setError(data.message || '로그인/회원가입에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError('서버와 통신할 수 없습니다.');
      // 임시로 관리자/일반 로그인 허용 (테스트용)
      // login({ name, team, pin, role: name.includes('관리자') ? 'admin' : 'employee' });
      // navigate('/dashboard');
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
          <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }}
            disabled={loading}
          >
            {loading ? (
              <div className="loader" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
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
