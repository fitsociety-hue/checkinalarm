import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Calendar, Users, Utensils, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('meal'); // 'meal', 'volunteer', 'admin'
  const [mealDates, setMealDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerCount, setVolunteerCount] = useState(1);

  // Check if current time is past 11:00 AM
  const isPastDeadline = () => {
    const now = new Date();
    return now.getHours() >= 11;
  };

  useEffect(() => {
    // Generate next 5 weekdays
    const dates = [];
    let curr = new Date();
    while (dates.length < 5) {
      if (curr.getDay() !== 0 && curr.getDay() !== 6) { // Skip weekends
        dates.push({
          date: new Date(curr),
          dateStr: curr.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }),
          status: 'meal', // 'meal', 'no-meal', 'vacation', etc.
          disabled: dates.length === 0 && isPastDeadline() // Disable today if past 11 AM
        });
      }
      curr.setDate(curr.getDate() + 1);
    }
    setMealDates(dates);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMealStatusChange = (index, status) => {
    if (mealDates[index].disabled && user.role !== 'admin') {
      alert('오전 11시 이후에는 오늘 식사 여부를 변경할 수 없습니다. 관리자에게 문의하세요.');
      return;
    }
    
    const newDates = [...mealDates];
    newDates[index].status = status;
    setMealDates(newDates);
  };

  const handleSaveMeals = () => {
    setLoading(true);
    // TODO: Send data to GAS
    setTimeout(() => {
      setLoading(false);
      alert('식사 일정이 저장되었습니다.');
    }, 1000);
  };

  const handleAddVolunteer = (e) => {
    e.preventDefault();
    if (!volunteerName || volunteerCount < 1) return;
    
    setLoading(true);
    // TODO: Send volunteer data to GAS
    setTimeout(() => {
      setLoading(false);
      alert(`${volunteerName} 등 ${volunteerCount}명의 자원봉사자 식수가 등록되었습니다.`);
      setVolunteerName('');
      setVolunteerCount(1);
    }, 1000);
  };

  return (
    <div className="page-container">
      <div className="glass-card" style={{ padding: '24px 32px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--primary-color)', fontSize: '24px', marginBottom: '4px' }}>
            식사 체크인 시스템
          </h1>
          <p className="text-muted">
            환영합니다, {user?.team} {user?.name}님
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-outline"
            onClick={() => navigate('/config')}
            title="알림 설정"
          >
            <Settings size={18} />
            <span className="hidden-mobile">알림 설정</span>
          </button>
          <button 
            className="btn btn-outline"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span className="hidden-mobile">로그아웃</span>
          </button>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'meal' ? 'active' : ''}`}
          onClick={() => setActiveTab('meal')}
        >
          나의 식사 일정
        </button>
        <button 
          className={`tab ${activeTab === 'volunteer' ? 'active' : ''}`}
          onClick={() => setActiveTab('volunteer')}
        >
          자원봉사자 등록
        </button>
        {user?.role === 'admin' && (
          <button 
            className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            관리자 대시보드
          </button>
        )}
      </div>

      <div className="grid-2">
        {activeTab === 'meal' && (
          <div className="glass-card" style={{ padding: '32px', gridColumn: '1 / -1' }}>
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} className="text-primary" />
              향후 식사 일정
            </h2>
            
            <div style={{ backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertCircle size={20} style={{ color: '#3B82F6', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '14px', color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
                당일 식사 여부는 <strong>오전 11시 전까지</strong>만 수정 가능합니다.<br/>
                휴가, 외부출장 등 식사 불가 사유가 있는 경우 사전에 '미식사'로 등록해 주세요.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mealDates.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  opacity: item.disabled && user.role !== 'admin' ? 0.6 : 1
                }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.dateStr} {index === 0 ? '(오늘)' : ''}
                    </div>
                    {item.disabled && user.role !== 'admin' && (
                      <div style={{ fontSize: '12px', color: 'var(--danger)' }}>마감됨</div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className={`btn ${item.status === 'meal' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '8px 16px', borderRadius: '20px' }}
                      onClick={() => handleMealStatusChange(index, 'meal')}
                      disabled={item.disabled && user.role !== 'admin'}
                    >
                      <Utensils size={14} /> 식사
                    </button>
                    <button 
                      className={`btn ${item.status === 'no-meal' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: item.status === 'no-meal' ? '#EF4444' : '', borderColor: item.status === 'no-meal' ? '#EF4444' : '' }}
                      onClick={() => handleMealStatusChange(index, 'no-meal')}
                      disabled={item.disabled && user.role !== 'admin'}
                    >
                      미식사
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary"
                onClick={handleSaveMeals}
                disabled={loading}
              >
                {loading ? '저장 중...' : '일정 저장하기'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'volunteer' && (
          <div className="glass-card" style={{ padding: '32px' }}>
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} className="text-primary" />
              자원봉사자 식수 등록
            </h2>
            
            <form onSubmit={handleAddVolunteer}>
              <div className="form-group">
                <label className="label">봉사자 이름 또는 단체명</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="예: 대한적십자사 봉사단"
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">식수 인원 (명)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  min="1"
                  value={volunteerCount}
                  onChange={(e) => setVolunteerCount(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? '등록 중...' : '등록하기'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="glass-card" style={{ padding: '32px', gridColumn: '1 / -1' }}>
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils size={20} className="text-primary" />
              오늘의 식수 현황 (관리자)
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>직원 식수</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary-color)' }}>42명</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>자원봉사자 식수</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--success)' }}>8명</div>
              </div>
              <div style={{ backgroundColor: 'var(--primary-color)', padding: '24px', borderRadius: '16px', textAlign: 'center', color: 'white', boxShadow: '0 10px 20px rgba(74, 96, 225, 0.2)' }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>총 예상 식수</div>
                <div style={{ fontSize: '32px', fontWeight: '700' }}>50명</div>
              </div>
            </div>

            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>미체크 직원 목록</h3>
            <p className="text-muted" style={{ marginBottom: '16px' }}>11시 이후 누락된 직원의 식사 여부를 관리자가 직접 수정할 수 있습니다.</p>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>소속</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>이름</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>상태</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 16px' }}>사회복지팀</td>
                  <td style={{ padding: '12px 16px' }}>김철수</td>
                  <td style={{ padding: '12px 16px', color: 'var(--danger)' }}>미체크 (미식사 처리됨)</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>식사로 변경</button>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px' }}>총무팀</td>
                  <td style={{ padding: '12px 16px' }}>이영희</td>
                  <td style={{ padding: '12px 16px', color: 'var(--danger)' }}>미체크 (미식사 처리됨)</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>식사로 변경</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
