import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Calendar, Users, Utensils, AlertCircle } from 'lucide-react';
import { fetchGAS } from '../api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'admin' : 'meal');
  const [mealDates, setMealDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerCount, setVolunteerCount] = useState(1);
  const [volunteersList, setVolunteersList] = useState([]);
  const [volunteerDate, setVolunteerDate] = useState('');
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  
  // Admin Data
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  
  // Admin Password Change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Personal Settings
  const [personalAlarm, setPersonalAlarm] = useState({
    webhookUrl: '',
    alarmTime: '09:00',
    alarmDays: '평일'
  });
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
          status: 'none', // 'none', 'meal', 'no-meal'
          disabled: dates.length === 0 && isPastDeadline() // Disable today if past 11 AM
        });
      }
      curr.setDate(curr.getDate() + 1);
    }
    setMealDates(dates);
    if (dates.length > 0) {
      setVolunteerDate(dates[0].dateStr);
    }

    // Fetch saved meals for the user
    if (user?.role !== 'admin' && user?.name && user?.team) {
      fetchGAS('getMeals', { name: user.name, team: user.team })
        .then(result => {
          if (result.success && result.data) {
            const savedMealsMap = {};
            result.data.forEach(m => { savedMealsMap[m.dateStr] = m.status; });
            
            setMealDates(prevDates => prevDates.map(d => ({
              ...d,
              status: savedMealsMap[d.dateStr] || d.status
            })));
          }
        })
        .catch(err => console.error('Failed to fetch meals', err));
    }
  }, [user]);

  const [adminTargetDate, setAdminTargetDate] = useState('');

  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'admin') {
      fetchAdminData(adminTargetDate);
    }
    if (activeTab === 'personal') {
      fetchPersonalAlarm();
    }
    if (activeTab === 'volunteer' && user?.role !== 'admin') {
      fetchVolunteers();
    }
  }, [activeTab, adminTargetDate]);

  const fetchVolunteers = async () => {
    setLoading(true);
    try {
      const result = await fetchGAS('getVolunteers', { name: user.name });
      if (result.success && result.data) {
        setVolunteersList(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch volunteers', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async (targetDateStr = '') => {
    setAdminLoading(true);
    try {
      const result = await fetchGAS('getAdminDashboard', { targetDateStr });
      if (result.success) {
        setAdminData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchPersonalAlarm = async () => {
    setLoading(true);
    try {
      const result = await fetchGAS('getPersonalAlarm', { name: user.name, team: user.team });
      if (result.success && result.data) {
        setPersonalAlarm(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch personal alarm', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePersonalAlarmSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchGAS('savePersonalAlarm', {
        name: user.name,
        team: user.team,
        ...personalAlarm
      });
      alert('개인 알람 설정이 저장되었습니다.');
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminUpdateMeal = async (empName, empTeam, status) => {
    const statusText = status === 'meal' ? '식사' : status === 'no-meal' ? '미식사' : '미정';
    if (!window.confirm(`${empName}님의 식사 여부를 '${statusText}'으로 변경하시겠습니까?`)) return;
    
    setAdminLoading(true);
    try {
      const selectedDate = adminTargetDate || new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
      await fetchGAS('updateMealStatus', { name: empName, team: empTeam, status, dateStr: selectedDate });
      // Refresh admin data
      await fetchAdminData(adminTargetDate);
      alert('상태가 변경되었습니다.');
    } catch (err) {
      alert('변경 중 오류가 발생했습니다.');
      setAdminLoading(false);
    }
  };

  const handleAdminPasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    
    setLoading(true);
    try {
      const result = await fetchGAS('changeAdminPassword', {
        adminId: user.adminId || 'admin',
        currentPassword,
        newPassword
      });
      if (result.success) {
        alert('비밀번호가 성공적으로 변경되었습니다.');
        setShowPasswordChange(false);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        alert(result.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (err) {
      alert('서버와 통신할 수 없습니다.');
    } finally {
      setLoading(false);
    }
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

  const handleSaveMeals = async () => {
    setLoading(true);
    try {
      const datesToSave = mealDates.map(d => ({
        dateStr: d.dateStr,
        status: d.status
      }));
      await fetchGAS('saveMeals', { name: user.name, team: user.team, dates: datesToSave });
      alert('식사 일정이 성공적으로 저장되었습니다.');
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVolunteer = async (e) => {
    e.preventDefault();
    if (!volunteerDate || !volunteerName || volunteerCount < 1) return;
    
    setLoading(true);
    try {
      if (editingVolunteer) {
        const res = await fetchGAS('updateVolunteer', {
          name: user.name,
          oldDateStr: editingVolunteer.dateStr,
          oldVolunteerName: editingVolunteer.volunteerName,
          newDateStr: volunteerDate,
          newVolunteerName: volunteerName,
          count: volunteerCount
        });
        if (res.success) {
          alert('자원봉사자 식수 정보가 수정되었습니다.');
          setEditingVolunteer(null);
        } else {
          alert(res.message || '수정 중 오류가 발생했습니다.');
        }
      } else {
        await fetchGAS('saveVolunteer', { 
          name: user.name, 
          dateStr: volunteerDate,
          volunteerName, 
          count: volunteerCount 
        });
        alert(`${volunteerDate} - ${volunteerName} 등 ${volunteerCount}명의 자원봉사자 식수가 등록되었습니다.`);
      }
      
      setVolunteerName('');
      setVolunteerCount(1);
      if (mealDates.length > 0) {
        setVolunteerDate(mealDates[0].dateStr);
      }
      await fetchVolunteers();
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVolunteer = async (item) => {
    if (!window.confirm(`${item.dateStr}의 ${item.volunteerName} 자원봉사자 식수 등록을 삭제하시겠습니까?`)) return;
    
    setLoading(true);
    try {
      const res = await fetchGAS('deleteVolunteer', {
        name: user.name,
        dateStr: item.dateStr,
        volunteerName: item.volunteerName
      });
      if (res.success) {
        alert('삭제 완료되었습니다.');
        await fetchVolunteers();
      } else {
        alert(res.message || '삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditVolunteer = (item) => {
    setEditingVolunteer(item);
    setVolunteerDate(item.dateStr);
    setVolunteerName(item.volunteerName);
    setVolunteerCount(item.count);
  };

  const handleCancelEdit = () => {
    setEditingVolunteer(null);
    setVolunteerName('');
    setVolunteerCount(1);
    if (mealDates.length > 0) {
      setVolunteerDate(mealDates[0].dateStr);
    }
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
          {user?.role === 'admin' && (
            <button 
              className="btn btn-outline"
              onClick={() => navigate('/config')}
              title="시스템 알림 설정"
            >
              <Settings size={18} />
              <span className="hidden-mobile">시스템 설정</span>
            </button>
          )}
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
        {user?.role !== 'admin' ? (
          <>
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
            <button 
              className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              개인 설정
            </button>
          </>
        ) : (
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
                      className={`btn ${item.status === 'none' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: item.status === 'none' ? '#9CA3AF' : '', borderColor: item.status === 'none' ? '#9CA3AF' : '' }}
                      onClick={() => handleMealStatusChange(index, 'none')}
                      disabled={item.disabled && user.role !== 'admin'}
                    >
                      미정
                    </button>
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
          <>
            <div className="glass-card" style={{ padding: '32px' }}>
              <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} className="text-primary" />
                {editingVolunteer ? '자원봉사자 식수 수정' : '자원봉사자 식수 등록'}
              </h2>
              
              <form onSubmit={handleAddVolunteer}>
                <div className="form-group">
                  <label className="label">날짜 선택 (평일)</label>
                  <select 
                    className="input-field"
                    value={volunteerDate}
                    onChange={(e) => setVolunteerDate(e.target.value)}
                    required
                  >
                    {mealDates.map((d, idx) => (
                      <option key={idx} value={d.dateStr}>
                        {d.dateStr} {idx === 0 ? '(오늘)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
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
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  {editingVolunteer && (
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ flex: 1 }}
                      onClick={handleCancelEdit}
                    >
                      취소
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 2 }}
                    disabled={loading}
                  >
                    {loading ? '저장 중...' : (editingVolunteer ? '수정 완료' : '등록하기')}
                  </button>
                </div>
              </form>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
              <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} className="text-primary" />
                등록된 자원봉사자 내역
              </h2>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>날짜</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>봉사자명</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)' }}>식수</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)' }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volunteersList.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>등록된 자원봉사자가 없습니다.</td>
                      </tr>
                    ) : (
                      volunteersList.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '12px 16px' }}>{item.dateStr}</td>
                          <td style={{ padding: '12px 16px' }}>{item.volunteerName}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>{item.count}명</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '4px 8px', fontSize: '12px', height: 'auto' }}
                                onClick={() => handleStartEditVolunteer(item)}
                              >
                                수정
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '4px 8px', fontSize: '12px', height: 'auto', borderColor: '#EF4444', color: '#EF4444' }}
                                onClick={() => handleDeleteVolunteer(item)}
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'personal' && (
          <div className="glass-card" style={{ padding: '32px', gridColumn: '1 / -1' }}>
            <h2 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} className="text-primary" />
              개인 알람 설정
            </h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>매일 아침 식사 여부를 체크하도록 개인 구글 챗으로 알림을 받을 수 있습니다. (선택사항)</p>
            
            <form onSubmit={handlePersonalAlarmSave}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="label">구글 챗 웹훅(Webhook) URL (선택)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="url" 
                    className="input-field" 
                    placeholder="https://chat.googleapis.com/v1/spaces/..."
                    value={personalAlarm.webhookUrl}
                    onChange={(e) => setPersonalAlarm({...personalAlarm, webhookUrl: e.target.value})}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={async () => {
                      if (!personalAlarm.webhookUrl) {
                        alert('웹훅 URL을 입력해주세요.');
                        return;
                      }
                      setLoading(true);
                      try {
                        const res = await fetchGAS('testWebhook', { 
                          webhookUrl: personalAlarm.webhookUrl,
                          testMessage: `🔔 [테스트] ${user.team} ${user.name}님의 식수 관리 개인 알림이 성공적으로 연결되었습니다!`
                        });
                        alert(res.message);
                      } catch (err) {
                        alert('테스트 알림 전송에 실패했습니다.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || !personalAlarm.webhookUrl}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    테스트
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">알람 시간</label>
                  <input 
                    type="time" 
                    className="input-field" 
                    value={personalAlarm.alarmTime}
                    onChange={(e) => setPersonalAlarm({...personalAlarm, alarmTime: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">알람 요일</label>
                  <select 
                    className="input-field"
                    value={personalAlarm.alarmDays}
                    onChange={(e) => setPersonalAlarm({...personalAlarm, alarmDays: e.target.value})}
                  >
                    <option value="평일">평일 (월~금)</option>
                    <option value="매일">매일 (월~일)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="glass-card" style={{ padding: '32px', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Utensils size={20} className="text-primary" />
                오늘의 식수 현황 (관리자)
              </h2>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                style={{ padding: '6px 12px', fontSize: '14px' }}
              >
                비밀번호 변경
              </button>
            </div>
            
            {showPasswordChange && (
              <div style={{ backgroundColor: '#F9FAFB', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>관리자 비밀번호 변경</h3>
                <form onSubmit={handleAdminPasswordChange} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="label">현재 비밀번호</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="label">새 비밀번호</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? '변경 중...' : '변경 저장'}
                  </button>
                </form>
              </div>
            )}
            
            {adminLoading && !adminData ? (
              <p>데이터를 불러오는 중입니다...</p>
            ) : adminData ? (
              <>
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label htmlFor="adminDateSelect" style={{ fontWeight: '600' }}>조회 일자:</label>
                  <select 
                    id="adminDateSelect"
                    className="input-field"
                    style={{ width: '200px', margin: 0, padding: '8px' }}
                    value={adminTargetDate}
                    onChange={(e) => setAdminTargetDate(e.target.value)}
                  >
                    <option value="">오늘 ({new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })})</option>
                    {[1, 2, 3, 4, 5].map(offset => {
                      const d = new Date();
                      d.setDate(d.getDate() + offset);
                      if (d.getDay() === 0 || d.getDay() === 6) {
                        d.setDate(d.getDate() + (d.getDay() === 6 ? 2 : 1));
                      }
                      const dateStr = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
                      return <option key={offset} value={dateStr}>{dateStr}</option>;
                    })}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>식사 인원 (직원)</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary-color)' }}>{adminData.mealCount}명</div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>미식사 인원</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#EF4444' }}>{adminData.noMealCount}명</div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>미정 인원</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#6B7280' }}>{adminData.undecidedCount || 0}명</div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>자원봉사자 식수</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--success)' }}>{adminData.volCount}명</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--primary-color)', padding: '24px', borderRadius: '16px', textAlign: 'center', color: 'white', boxShadow: '0 10px 20px rgba(74, 96, 225, 0.2)' }}>
                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>총 예상 식수</div>
                    <div style={{ fontSize: '32px', fontWeight: '700' }}>{adminData.mealCount + adminData.volCount}명</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', margin: 0 }}>미체크 및 미정 직원 목록 ({adminData.uncheckedUsers.length}명)</h3>
                  <button className="btn btn-outline" onClick={() => fetchAdminData(adminTargetDate)} disabled={adminLoading} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    {adminLoading ? '새로고침 중...' : '새로고침'}
                  </button>
                </div>
                
                <p className="text-muted" style={{ marginBottom: '16px' }}>11시 이후 누락된 직원의 식사 여부를 관리자가 직접 수정할 수 있습니다.</p>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>소속</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>이름</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>상태</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)' }}>관리자 조치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminData.uncheckedUsers.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>미체크 인원이 없습니다.</td>
                        </tr>
                      ) : (
                        adminData.uncheckedUsers.map((u, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '12px 16px' }}>{u.team}</td>
                            <td style={{ padding: '12px 16px' }}>{u.name}</td>
                            <td style={{ padding: '12px 16px', color: u.status === '미체크' ? 'var(--danger)' : '#6B7280' }}>
                              {u.status}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '8px' }}>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#9CA3AF', color: '#6B7280' }}
                                  onClick={() => handleAdminUpdateMeal(u.name, u.team, 'none')}
                                  disabled={adminLoading}
                                >
                                  미정
                                </button>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                  onClick={() => handleAdminUpdateMeal(u.name, u.team, 'meal')}
                                  disabled={adminLoading}
                                >
                                  식사
                                </button>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#EF4444', color: '#EF4444' }}
                                  onClick={() => handleAdminUpdateMeal(u.name, u.team, 'no-meal')}
                                  disabled={adminLoading}
                                >
                                  미식사
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
