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

  const [adminSubTab, setAdminSubTab] = useState('today'); // 'today' | 'report'
  
  // Report states
  const [reportRawData, setReportRawData] = useState({ users: [], meals: [], volunteers: [] });
  const [reportLoading, setReportLoading] = useState(false);
  const [periodType, setPeriodType] = useState('day'); // 'day', 'week', 'month', 'quarter'
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]); // yyyy-MM-dd
  
  const getCurrentWeekString = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };
  
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  
  const [outputType, setOutputType] = useState('mealsOnly'); // 'mealsOnly', 'all'
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReportData = async () => {
    setReportLoading(true);
    try {
      const result = await fetchGAS('getReportData');
      if (result.success && result.data) {
        setReportRawData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch report data', err);
    } finally {
      setReportLoading(false);
    }
  };

  const parseKoreanDate = (dateStr, timestampStr) => {
    if (!dateStr) return null;
    let year = new Date().getFullYear();
    if (timestampStr) {
      const tsDate = new Date(timestampStr);
      if (!isNaN(tsDate.getTime())) {
        year = tsDate.getFullYear();
      }
    }
    
    const str = dateStr.toString().trim();
    
    // 만약 표준 ISO 날짜 형식이거나 T/Z/GMT를 포함하는 시간 문자열이라면
    // 정규식 가로채기 전에 Native Date 생성자로 타임존을 포함해 가장 정확하게 로컬로 해석
    if (str.includes('T') || str.includes('GMT') || /^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const nativeParsed = new Date(str);
      if (!isNaN(nativeParsed.getTime())) {
        return nativeParsed;
      }
    }
    
    // 패턴 1: 2026-05-20 또는 2026.05.20 또는 26-05-20 등
    const ymdRegex = /^(\d{4})[-.](\d{1,2})[-.](\d{1,2})/;
    const ymdMatch = str.match(ymdRegex);
    if (ymdMatch) {
      return new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
    }
    
    // 패턴 2: M월 d일 (요일) 또는 M월 d일 요일 등
    const mdKoreanRegex = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/;
    const mdKoreanMatch = str.match(mdKoreanRegex);
    if (mdKoreanMatch) {
      const month = parseInt(mdKoreanMatch[1], 10) - 1;
      const day = parseInt(mdKoreanMatch[2], 10);
      return new Date(year, month, day);
    }
    
    // 패턴 3: M. d. (요일) 또는 M. d. 요일 또는 M. d.
    const mdDotRegex = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.?/;
    const mdDotMatch = str.match(mdDotRegex);
    if (mdDotMatch) {
      const month = parseInt(mdDotMatch[1], 10) - 1;
      const day = parseInt(mdDotMatch[2], 10);
      return new Date(year, month, day);
    }
    
    // 패턴 4: Native JS Date parsing fallback
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    return null;
  };

  const formatDateToStandard = (dateObj) => {
    if (!dateObj) return '';
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const month = dateObj.getMonth() + 1;
    const date = dateObj.getDate();
    const dayOfWeek = weekdays[dateObj.getDay()];
    return `${month}월 ${date}일 (${dayOfWeek})`;
  };

  const areDatesEqual = (dateStrA, dateStrB) => {
    if (!dateStrA || !dateStrB) return false;
    if (dateStrA.toString().trim() === dateStrB.toString().trim()) return true;
    
    const dateA = parseKoreanDate(dateStrA);
    const dateB = parseKoreanDate(dateStrB);
    
    if (!dateA || !dateB) return false;
    
    return dateA.getFullYear() === dateB.getFullYear() &&
           dateA.getMonth() === dateB.getMonth() &&
           dateA.getDate() === dateB.getDate();
  };

  const isDateInPeriod = (dateObj) => {
    if (!dateObj) return false;
    const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    
    if (periodType === 'day') {
      const target = new Date(selectedDay + 'T00:00:00');
      return d.getFullYear() === target.getFullYear() &&
             d.getMonth() === target.getMonth() &&
             d.getDate() === target.getDate();
    }
    
    if (periodType === 'week') {
      const [yrStr, wkStr] = selectedWeek.split('-W');
      const year = parseInt(yrStr, 10);
      const week = parseInt(wkStr, 10);
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4) {
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      } else {
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      }
      const ISOweekEnd = new Date(ISOweekStart);
      ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
      return d >= ISOweekStart && d <= ISOweekEnd;
    }
    
    if (periodType === 'month') {
      const [yrStr, moStr] = selectedMonth.split('-');
      const year = parseInt(yrStr, 10);
      const month = parseInt(moStr, 10) - 1;
      return d.getFullYear() === year && d.getMonth() === month;
    }
    
    if (periodType === 'quarter') {
      const q = parseInt(selectedQuarter, 10);
      const y = parseInt(selectedYear, 10);
      const startMonth = (q - 1) * 3;
      const endMonth = q * 3 - 1;
      return d.getFullYear() === y && d.getMonth() >= startMonth && d.getMonth() <= endMonth;
    }
    
    return false;
  };

  const getPeriodLabel = () => {
    if (periodType === 'day') {
      const d = new Date(selectedDay + 'T00:00:00');
      return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    }
    if (periodType === 'week') {
      const [yrStr, wkStr] = selectedWeek.split('-W');
      const year = parseInt(yrStr, 10);
      const week = parseInt(wkStr, 10);
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4) {
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      } else {
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      }
      const ISOweekEnd = new Date(ISOweekStart);
      ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
      const startStr = ISOweekStart.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      const endStr = ISOweekEnd.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      return `${year}년 ${week}주차 (${startStr} ~ ${endStr})`;
    }
    if (periodType === 'month') {
      const [yrStr, moStr] = selectedMonth.split('-');
      return `${yrStr}년 ${parseInt(moStr, 10)}월`;
    }
    if (periodType === 'quarter') {
      return `${selectedYear}년 ${selectedQuarter}분기 (${(selectedQuarter - 1) * 3 + 1}월 ~ ${selectedQuarter * 3}월)`;
    }
    return '';
  };

  const getReportRows = () => {
    const rows = [];
    const allDateStrs = [...new Set([
      ...reportRawData.meals.map(m => formatDateToStandard(parseKoreanDate(m.dateStr))),
      ...reportRawData.volunteers.map(v => formatDateToStandard(parseKoreanDate(v.dateStr)))
    ])].filter(Boolean);
    
    const activeDates = allDateStrs.filter(dateStr => {
      const parsed = parseKoreanDate(dateStr);
      return isDateInPeriod(parsed);
    });
    
    activeDates.sort((a, b) => {
      const da = parseKoreanDate(a);
      const db = parseKoreanDate(b);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });
    
    activeDates.forEach(dateStr => {
      const mealsForDate = reportRawData.meals.filter(m => {
        const std = formatDateToStandard(parseKoreanDate(m.dateStr));
        return std === dateStr;
      });
      const mealStatusMap = {};
      mealsForDate.forEach(m => {
        mealStatusMap[`${m.name}_${m.team}`] = m.status;
      });
      
      const volunteersForDate = reportRawData.volunteers.filter(v => {
        const std = formatDateToStandard(parseKoreanDate(v.dateStr));
        return std === dateStr;
      });
      
      // A. Employees
      reportRawData.users.forEach(u => {
        const status = mealStatusMap[`${u.name}_${u.team}`] || 'none';
        let statusText = '미정/미체크';
        if (status === 'meal') statusText = '식사';
        else if (status === 'no-meal') statusText = '미식사';
        
        if (outputType === 'mealsOnly' && status !== 'meal') {
          return;
        }
        
        if (selectedTeam !== 'all' && u.team !== selectedTeam) {
          return;
        }
        
        if (searchQuery) {
          const matchName = u.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchTeam = u.team.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchName && !matchTeam) {
            return;
          }
        }
        
        rows.push({
          dateStr,
          type: '직원',
          name: u.name,
          team: u.team,
          volunteerName: '-',
          count: status === 'meal' ? 1 : 0,
          statusText,
          status,
          remarks: '-'
        });
      });
      
      // B. Volunteers
      volunteersForDate.forEach(v => {
        if (outputType === 'mealsOnly' && v.count <= 0) {
          return;
        }
        
        const recorderUser = reportRawData.users.find(u => u.name === v.recorder);
        const recorderTeam = recorderUser ? recorderUser.team : '';
        
        if (selectedTeam !== 'all' && recorderTeam !== selectedTeam) {
          return;
        }
        
        if (searchQuery) {
          const matchVolName = v.volunteerName.toLowerCase().includes(searchQuery.toLowerCase());
          const matchRecorder = v.recorder.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchVolName && !matchRecorder) {
            return;
          }
        }
        
        rows.push({
          dateStr,
          type: '자원봉사자',
          name: '-',
          team: recorderTeam ? recorderTeam : '-',
          volunteerName: v.volunteerName,
          count: v.count,
          statusText: '식사',
          status: 'meal',
          remarks: `등록자: ${v.recorder}`
        });
      });
    });
    
    return rows;
  };

  const exportToCSV = () => {
    const rows = getReportRows();
    if (rows.length === 0) {
      alert('출력할 데이터가 없습니다.');
      return;
    }
    
    const headers = ['번호', '날짜', '구분', '직원 이름', '소속 팀명', '자원봉사자 이름', '인원', '식사여부', '비고'];
    
    const csvContent = rows.map((r, idx) => [
      idx + 1,
      r.dateStr,
      r.type,
      r.name,
      r.team,
      r.volunteerName,
      r.count,
      r.statusText,
      r.remarks
    ]);
    
    const csvString = [headers, ...csvContent]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');
      
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fileName = `식수인원실적_${periodType}_${getPeriodLabel().replace(/[\s()~./]/g, '_')}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      if (adminSubTab === 'today') {
        fetchAdminData(adminTargetDate);
      } else if (adminSubTab === 'report') {
        fetchReportData();
      }
    }
    if (activeTab === 'personal') {
      fetchPersonalAlarm();
    }
    if (activeTab === 'volunteer' && user?.role !== 'admin') {
      fetchVolunteers();
    }
  }, [activeTab, adminTargetDate, adminSubTab]);

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
            {/* Admin Sub-Tabs */}
            <div className="tabs sub-tabs no-print" style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }}>
              <button 
                className={`tab ${adminSubTab === 'today' ? 'active' : ''}`}
                onClick={() => setAdminSubTab('today')}
                style={{ fontSize: '14px', padding: '8px 4px' }}
              >
                오늘의 현황
              </button>
              <button 
                className={`tab ${adminSubTab === 'report' ? 'active' : ''}`}
                onClick={() => setAdminSubTab('report')}
                style={{ fontSize: '14px', padding: '8px 4px' }}
              >
                식수 실적 조회 및 출력
              </button>
            </div>

            {adminSubTab === 'today' && (
              <>
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
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    backgroundColor: '#FEE2E2',
                                    color: '#DC2626'
                                  }}>
                                    {u.status}
                                  </span>
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
              </>
            )}

            {adminSubTab === 'report' && (
              <div id="print-section">
                {/* 1. Header (Print visible) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }} className="report-header">
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--primary-color)', margin: 0 }}>
                      식수 인원 실적 보고서
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      조회 범위: <strong>{getPeriodLabel()}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }} className="no-print">
                    <button 
                      className="btn btn-outline" 
                      onClick={() => fetchReportData()} 
                      disabled={reportLoading}
                    >
                      새로고침
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={exportToCSV}
                    >
                      엑셀 다운로드 (CSV)
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => window.print()}
                    >
                      인쇄하기
                    </button>
                  </div>
                </div>

                {/* 2. Search & Filter Panel (no-print) */}
                <div className="glass-card no-print" style={{ padding: '20px', marginBottom: '24px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    {/* Period Selector */}
                    <div>
                      <label className="label">조회 주기</label>
                      <select 
                        className="input-field" 
                        value={periodType} 
                        onChange={(e) => setPeriodType(e.target.value)}
                      >
                        <option value="day">일 단위</option>
                        <option value="week">주 단위</option>
                        <option value="month">월 단위</option>
                        <option value="quarter">분기별</option>
                      </select>
                    </div>

                    {/* Date Input dynamically changes by periodType */}
                    <div>
                      <label className="label">날짜 선택</label>
                      {periodType === 'day' && (
                        <input 
                          type="date" 
                          className="input-field" 
                          value={selectedDay} 
                          onChange={(e) => setSelectedDay(e.target.value)} 
                        />
                      )}
                      {periodType === 'week' && (
                        <input 
                          type="week" 
                          className="input-field" 
                          value={selectedWeek} 
                          onChange={(e) => setSelectedWeek(e.target.value)} 
                        />
                      )}
                      {periodType === 'month' && (
                        <input 
                          type="month" 
                          className="input-field" 
                          value={selectedMonth} 
                          onChange={(e) => setSelectedMonth(e.target.value)} 
                        />
                      )}
                      {periodType === 'quarter' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select 
                            className="input-field" 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))} 
                            style={{ flex: 1 }}
                          >
                            {[2025, 2026, 2027, 2028].map(yr => (
                              <option key={yr} value={yr}>{yr}년</option>
                            ))}
                          </select>
                          <select 
                            className="input-field" 
                            value={selectedQuarter} 
                            onChange={(e) => setSelectedQuarter(Number(e.target.value))} 
                            style={{ flex: 1 }}
                          >
                            <option value="1">1분기</option>
                            <option value="2">2분기</option>
                            <option value="3">3분기</option>
                            <option value="4">4분기</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Output Format (Meal taker filter) */}
                    <div>
                      <label className="label">출력 대상 양식</label>
                      <select 
                        className="input-field" 
                        value={outputType} 
                        onChange={(e) => setOutputType(e.target.value)}
                      >
                        <option value="mealsOnly">식사 인원만 출력 (직원+자원봉사자)</option>
                        <option value="all">식사 및 미식사 전체 출력</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {/* Team Filter */}
                    <div>
                      <label className="label">소속 팀 필터</label>
                      <select 
                        className="input-field" 
                        value={selectedTeam} 
                        onChange={(e) => setSelectedTeam(e.target.value)}
                      >
                        <option value="all">전체 소속</option>
                        {[...new Set(reportRawData.users.map(u => u.team).filter(Boolean))].map(team => (
                          <option key={team} value={team}>{team}</option>
                        ))}
                      </select>
                    </div>

                    {/* Text Search */}
                    <div>
                      <label className="label">이름 검색</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="이름 또는 소속팀 검색..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Summary Statistics Cards */}
                {reportLoading ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div className="loader" style={{ marginBottom: '12px' }}></div>
                    <p className="text-muted">실적 데이터를 분석하고 집계하는 중입니다...</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }} className="report-summary-cards">
                      <div style={{ backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #BFDBFE' }}>
                        <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: '600', marginBottom: '4px' }}>총 식사 인원</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#1D4ED8' }}>
                          {getReportRows().reduce((sum, r) => sum + (r.status === 'meal' ? r.count : 0), 0)}명
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #BBF7D0' }}>
                        <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>직원 식사</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#15803D' }}>
                          {getReportRows().filter(r => r.type === '직원' && r.status === 'meal').length}명
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#ECFDF5', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #A7F3D0' }}>
                        <div style={{ fontSize: '12px', color: '#065F46', fontWeight: '600', marginBottom: '4px' }}>자원봉사자 식수</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#047857' }}>
                          {getReportRows().filter(r => r.type === '자원봉사자').reduce((sum, r) => sum + r.count, 0)}명
                        </div>
                      </div>
                      {outputType === 'all' && (
                        <>
                          <div style={{ backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #FECACA' }}>
                            <div style={{ fontSize: '12px', color: '#991B1B', fontWeight: '600', marginBottom: '4px' }}>미식사 직원</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#DC2626' }}>
                              {getReportRows().filter(r => r.type === '직원' && r.status === 'no-meal').length}명
                            </div>
                          </div>
                          <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                            <div style={{ fontSize: '12px', color: '#374151', fontWeight: '600', marginBottom: '4px' }}>미정/미체크</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4B5563' }}>
                              {getReportRows().filter(r => r.type === '직원' && r.status === 'none').length}명
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 4. Detailed Table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }} className="report-table">
                        <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                          <tr>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', width: '60px' }}>번호</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', width: '120px' }}>날짜</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', width: '100px' }}>구분</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', width: '120px' }}>이름</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', width: '130px' }}>소속 팀명</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', width: '160px' }}>자원봉사자 이름</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', width: '80px' }}>인원</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', width: '100px' }}>식사여부</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>비고</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getReportRows().length === 0 ? (
                            <tr>
                              <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                조건에 부합하는 식수 인원 실적 기록이 없습니다.
                              </td>
                            </tr>
                          ) : (
                            getReportRows().map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{idx + 1}</td>
                                <td style={{ padding: '12px 16px' }}>{row.dateStr}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    backgroundColor: row.type === '직원' ? '#E0E7FF' : '#D1FAE5',
                                    color: row.type === '직원' ? '#3730A3' : '#065F46'
                                  }}>
                                    {row.type}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', fontWeight: row.type === '직원' ? '600' : '400' }}>{row.name}</td>
                                <td style={{ padding: '12px 16px' }}>{row.team}</td>
                                <td style={{ padding: '12px 16px', color: row.type === '자원봉사자' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                  {row.volunteerName}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700' }}>
                                  {row.count > 0 ? `${row.count}명` : '-'}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    backgroundColor: row.status === 'meal' ? '#D1FAE5' : row.status === 'no-meal' ? '#FEE2E2' : '#F3F4F6',
                                    color: row.status === 'meal' ? '#065F46' : row.status === 'no-meal' ? '#991B1B' : '#374151'
                                  }}>
                                    {row.statusText}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{row.remarks}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
