import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { fetchGAS } from '../api';

export default function Config() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    systemName: '강동어울림복지관 식수 관리',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/...',
    webhookUrl: '',
    alarmTime: '10:40',
    startDate: '',
    endDate: '',
    weekdayOnly: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchGAS('saveConfig', formData);
      alert('알람 설정이 성공적으로 저장되었습니다.');
      navigate('/dashboard');
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button 
          className="btn btn-outline" 
          onClick={() => navigate('/dashboard')}
          style={{ backgroundColor: 'white' }}
        >
          <ArrowLeft size={16} /> 돌아가기
        </button>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '40px' }}>
        <h2 style={{ color: 'var(--primary-color)', marginBottom: '32px', fontSize: '24px' }}>새 알람 설정 추가</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">
              알람 시스템 이름 <span className="text-primary">*</span>
            </label>
            <input 
              type="text" 
              name="systemName"
              className="input-field" 
              placeholder="예: 2026 복지관 만족도 조사"
              value={formData.systemName}
              onChange={handleChange}
              required
            />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              목록에서 식별하기 위한 용도입니다.
            </div>
          </div>

          <div className="form-group">
            <label className="label">
              모니터링할 구글 스프레드시트 URL <span className="text-primary">*</span>
            </label>
            <input 
              type="url" 
              name="sheetUrl"
              className="input-field" 
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={formData.sheetUrl}
              onChange={handleChange}
              required
            />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              데이터가 수집되는 구글 폼 응답 스프레드시트 주소를 입력하세요
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="label">
              구글 챗 웹훅(Webhook) URL <span className="text-primary">*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="url" 
                name="webhookUrl"
                className="input-field" 
                placeholder="https://chat.googleapis.com/v1/spaces/..."
                value={formData.webhookUrl}
                onChange={handleChange}
                required
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={async () => {
                  if (!formData.webhookUrl) {
                    alert('웹훅 URL을 먼저 입력해주세요.');
                    return;
                  }
                  setLoading(true);
                  try {
                    const res = await fetchGAS('testWebhook', { 
                      webhookUrl: formData.webhookUrl,
                      testMessage: `📢 [테스트] '${formData.systemName}' 관리자 알림이 성공적으로 연결되었습니다!`
                    });
                    alert(res.message);
                  } catch (err) {
                    alert('테스트 알림 전송에 실패했습니다.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !formData.webhookUrl}
                style={{ whiteSpace: 'nowrap' }}
              >
                연결 테스트
              </button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              알람을 받을 구글 챗 스페이스의 웹훅 주소입니다.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="label">시작일 (선택)</label>
              <input 
                type="date" 
                name="startDate"
                className="input-field"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">종료일 (선택)</label>
              <input 
                type="date" 
                name="endDate"
                className="input-field"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="label">
              정규 알람 시간 <span className="text-primary">*</span>
            </label>
            <input 
              type="time" 
              name="alarmTime"
              className="input-field"
              value={formData.alarmTime || '10:40'}
              onChange={handleChange}
              required
            />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              미체크 인원에게 식수 조사 독려 알람이 발송될 시간입니다. (예: 10:40)
            </div>
          </div>

          <div style={{ 
            backgroundColor: '#F9FAFB', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '32px',
            border: '1px solid #E5E7EB'
          }}>
            <label className="checkbox-label" style={{ fontWeight: '600', marginBottom: '8px' }}>
              <input 
                type="checkbox" 
                name="weekdayOnly"
                checked={formData.weekdayOnly}
                onChange={handleChange}
                style={{ width: '16px', height: '16px' }}
              />
              평일(월~금)에만 알람 받기
            </label>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', paddingLeft: '24px' }}>
              체크 시, 주말(토, 일)에 신청된 응답은 알람이 발송되지 않으며, 일요일 오전 9시에 일괄적으로 취합되어 발송됩니다.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ flex: 1, backgroundColor: 'white' }}
              onClick={() => navigate('/dashboard')}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 2 }}
              disabled={loading}
            >
              {loading ? '저장 중...' : <><Save size={18} /> 저장하기</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
