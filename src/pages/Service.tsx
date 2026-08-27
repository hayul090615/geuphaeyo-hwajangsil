import { useEffect, useMemo, useState, type FormEvent } from 'react';
import ToiletCard from '../components/ToiletCard';
import { getNearbyToilets } from '../services/toiletService';
import type { Toilet } from '../types/toilet';

type ServiceProps = {
  onBack: () => void;
  onLogout: () => void;
};

type ToiletForm = {
  name: string;
  address: string;
  facilityType: NonNullable<Toilet['facilityType']>;
  locationDetail: string;
  openAllDay: boolean;
  openTime: string;
  closeTime: string;
  genderType: NonNullable<Toilet['genderType']>;
  accessible: boolean;
  babyFacility: boolean;
  note: string;
  agreed: boolean;
};

type ModalName = 'request' | 'add' | 'logout' | null;

const SUBMITTED_KEY = 'geuphaeyo-submitted-toilets';
const REQUEST_KEY = 'geuphaeyo-service-requests';
const initialForm = (): ToiletForm => ({
  name: '',
  address: '',
  facilityType: 'public',
  locationDetail: '',
  openAllDay: false,
  openTime: '09:00',
  closeTime: '18:00',
  genderType: 'unknown',
  accessible: false,
  babyFacility: false,
  note: '',
  agreed: false,
});

function normalize(value: string) {
  return value.toLocaleLowerCase('ko-KR').replace(/[\s\-_,.·()]/g, '');
}

function loadSubmitted(): Toilet[] {
  try {
    return JSON.parse(localStorage.getItem(SUBMITTED_KEY) || '[]') as Toilet[];
  } catch {
    return [];
  }
}

export default function Service({ onBack, onLogout }: ServiceProps) {
  const [query, setQuery] = useState('');
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [modal, setModal] = useState<ModalName>(null);
  const [form, setForm] = useState<ToiletForm>(initialForm);
  const [formError, setFormError] = useState('');
  const [requestCategory, setRequestCategory] = useState<'feature' | 'data' | 'bug' | 'other'>('feature');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestRecipient, setRequestRecipient] = useState<'hayul9888@gmail.com' | 'sg8111320@gmail.com'>('hayul9888@gmail.com');
  const [requestState, setRequestState] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    void getNearbyToilets().then((items) => setToilets([...loadSubmitted(), ...items]));
  }, []);

  useEffect(() => {
    if (!modal) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setModal(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modal]);

  const filtered = useMemo(() => {
    const keyword = normalize(query);
    return toilets.filter((toilet) => normalize(toilet.name + ' ' + toilet.address).includes(keyword));
  }, [query, toilets]);

  const closeModal = () => {
    setModal(null);
    setFormError('');
    setRequestState('');
  };

  const addToilet = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalize(form.name).length < 3 || normalize(form.address).length < 6) {
      setFormError('화장실 이름과 정확한 도로명 주소를 입력해 주세요.');
      return;
    }
    if (toilets.some((item) => normalize(item.name) === normalize(form.name) || normalize(item.address) === normalize(form.address))) {
      setFormError('이미 등록된 이름 또는 주소입니다.');
      return;
    }
    if (!form.openAllDay && (!form.openTime || !form.closeTime)) {
      setFormError('24시간 운영이 아니라면 시작 시간과 종료 시간을 입력해 주세요.');
      return;
    }
    if (!form.agreed) {
      setFormError('등록 규칙을 확인하고 동의해 주세요.');
      return;
    }

    const toilet: Toilet = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      address: form.address.trim(),
      distance: '거리 확인 중',
      facilityType: form.facilityType,
      locationDetail: form.locationDetail.trim(),
      openAllDay: form.openAllDay,
      hours: form.openAllDay ? '24시간' : `${form.openTime}~${form.closeTime}`,
      genderType: form.genderType,
      accessible: form.accessible,
      babyFacility: form.babyFacility,
      note: form.note.trim(),
      status: 'pending',
      latitude: 37.5665,
      longitude: 126.978,
    };
    const submitted = [toilet, ...loadSubmitted()];
    localStorage.setItem(SUBMITTED_KEY, JSON.stringify(submitted));
    setToilets((current) => [toilet, ...current]);
    setForm(initialForm());
    closeModal();
  };

  const saveRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestMessage.trim().length < 10) {
      setRequestState('요청 내용을 10자 이상 입력해 주세요.');
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(REQUEST_KEY) || '[]') as unknown[];
      localStorage.setItem(REQUEST_KEY, JSON.stringify([
        {
          id: crypto.randomUUID(),
          category: requestCategory,
          message: requestMessage.trim(),
          recipientEmail: requestRecipient,
          createdAt: new Date().toISOString(),
        },
        ...saved,
      ]));
      setRequestMessage('');
      setRequestState(`${requestRecipient} 담당자에게 보낼 요청이 임시 저장되었습니다.`);
    } catch {
      setRequestState('요청사항을 저장하지 못했습니다.');
    }
  };

  return (
    <div className="service-page">
      <header className="service-page-header">
        <button className="service-brand" type="button" onClick={onBack}>급해요<span>화장실</span></button>
        <nav className="service-page-actions" aria-label="고객센터 메뉴">
          <button className="service-back-button" type="button" onClick={onBack}>← 지도로 돌아가기</button>
          <button type="button" onClick={() => setModal('request')}>요청사항</button>
          <button className="service-primary-button" type="button" onClick={() => setModal('add')}>화장실 추가</button>
          <button className="service-logout-button" type="button" onClick={() => setModal('logout')}>로그아웃</button>
        </nav>
      </header>

      <main className="service-page-main">
        <section className="service-hero">
          <p>고객센터</p>
          <h1>더 나은 화장실 정보를<br /><strong>함께 만들어 주세요.</strong></h1>
          <span>새로운 장소를 제보하거나 서비스에 필요한 의견을 남길 수 있어요.</span>
          <label className="service-search">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="등록된 화장실을 검색해보세요" />
          </label>
        </section>

        <section className="service-guide" aria-labelledby="service-guide-title">
          <div><p>이용 방법</p><h2 id="service-guide-title">정확한 정보를 빠르게 제보하세요.</h2></div>
          <ol>
            <li><strong>정보 검색</strong><span>먼저 같은 장소가 등록되어 있는지 확인하세요.</span></li>
            <li><strong>장소 제보</strong><span>주소와 운영시간 등 확인한 정보를 입력하세요.</span></li>
            <li><strong>의견 남기기</strong><span>오류나 필요한 기능은 요청사항으로 알려주세요.</span></li>
          </ol>
        </section>

        <section className="service-toilet-section">
          <div className="service-section-title"><h2>화장실 추천</h2><span>{Math.min(filtered.length, 16)}곳</span></div>
          <div className="service-toilet-list">{filtered.slice(0, 16).map((toilet) => <ToiletCard key={toilet.id} toilet={toilet} />)}</div>
          {filtered.length === 0 && <p className="service-empty-result">검색 결과가 없습니다.</p>}
        </section>
      </main>

      {modal === 'add' && (
        <div className="service-modal-backdrop" onMouseDown={closeModal}>
          <section className="service-modal service-modal-wide" role="dialog" aria-modal="true" aria-labelledby="add-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="service-modal-header"><div><p>새로운 장소 제보</p><h2 id="add-title">화장실 추가</h2></div><button type="button" onClick={closeModal} aria-label="닫기">×</button></div>
            <p className="service-modal-description">정확한 장소와 이용 정보를 알려주세요. 제보는 이 브라우저에 검토 중 상태로 임시 저장됩니다.</p>
            <form className="service-form" onSubmit={addToilet}>
              <div className="service-form-grid">
                <label>화장실 이름 *<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                <label>시설 유형 *
                  <select value={form.facilityType} onChange={(event) => setForm({ ...form, facilityType: event.target.value as ToiletForm['facilityType'] })}>
                    <option value="public">공중화장실</option>
                    <option value="building">건물 내부</option>
                    <option value="station">역·터미널</option>
                    <option value="park">공원</option>
                    <option value="other">기타</option>
                  </select>
                </label>
                <label className="service-full-field">도로명 주소 *<input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
                <label>상세 위치<input value={form.locationDetail} onChange={(event) => setForm({ ...form, locationDetail: event.target.value })} /></label>
                <label>남녀 구분 *
                  <select value={form.genderType} onChange={(event) => setForm({ ...form, genderType: event.target.value as ToiletForm['genderType'] })}>
                    <option value="unknown">확인하지 못함</option>
                    <option value="separated">남녀 분리</option>
                    <option value="unisex">남녀 공용</option>
                  </select>
                </label>
                <fieldset className="service-time-field service-full-field" disabled={form.openAllDay}>
                  <legend>운영시간 *</legend>
                  <div>
                    <label>시작<input type="time" required={!form.openAllDay} value={form.openTime} onChange={(event) => setForm({ ...form, openTime: event.target.value })} /></label>
                    <span aria-hidden="true">~</span>
                    <label>종료<input type="time" required={!form.openAllDay} value={form.closeTime} onChange={(event) => setForm({ ...form, closeTime: event.target.value })} /></label>
                  </div>
                  {form.openAllDay && <small>24시간 운영으로 설정되었습니다.</small>}
                </fieldset>
                <label className="service-full-field">추가 설명<textarea maxLength={300} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
              </div>
              <div className="service-check-row">
                <label><input type="checkbox" checked={form.openAllDay} onChange={(event) => setForm({ ...form, openAllDay: event.target.checked })} /> 24시간 운영</label>
                <label><input type="checkbox" checked={form.accessible} onChange={(event) => setForm({ ...form, accessible: event.target.checked })} /> 장애인 접근 가능</label>
                <label><input type="checkbox" checked={form.babyFacility} onChange={(event) => setForm({ ...form, babyFacility: event.target.checked })} /> 기저귀 교환대 있음</label>
              </div>
              <label className="service-agreement"><span>정확한 정보임을 확인했으며 등록 규칙에 동의합니다.</span><input type="checkbox" checked={form.agreed} onChange={(event) => setForm({ ...form, agreed: event.target.checked })} /></label>
              {formError && <p className="service-form-status" role="alert">{formError}</p>}
              <div className="service-form-actions"><button type="button" onClick={closeModal}>취소</button><button className="service-submit-button" type="submit">검토 요청하기</button></div>
            </form>
          </section>
        </div>
      )}

      {modal === 'request' && (
        <div className="service-modal-backdrop" onMouseDown={closeModal}>
          <section className="service-modal" role="dialog" aria-modal="true" aria-labelledby="request-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="service-modal-header"><div><p>서비스 의견 보내기</p><h2 id="request-title">요청사항</h2></div><button type="button" onClick={closeModal} aria-label="닫기">×</button></div>
            <p className="service-modal-description">불편한 점이나 필요한 기능을 남겨주세요.</p>
            <form className="service-form" onSubmit={saveRequest}>
              <label>요청 유형<select value={requestCategory} onChange={(event) => setRequestCategory(event.target.value as typeof requestCategory)}><option value="feature">기능 제안</option><option value="data">화장실 정보 수정</option><option value="bug">오류 신고</option><option value="other">기타</option></select></label>
              <label>요청 내용 *<textarea required minLength={10} maxLength={1000} value={requestMessage} onChange={(event) => { setRequestMessage(event.target.value); setRequestState(''); }} /></label>
              <label>받는 사람 *
                <select required value={requestRecipient} onChange={(event) => setRequestRecipient(event.target.value as typeof requestRecipient)}>
                  <option value="hayul9888@gmail.com">hayul9888@gmail.com</option>
                  <option value="sg8111320@gmail.com">sg8111320@gmail.com</option>
                </select>
              </label>
              {requestState && <p className="service-form-status" role="status">{requestState}</p>}
              <div className="service-form-actions"><button type="button" onClick={closeModal}>닫기</button><button className="service-submit-button" type="submit">보내기</button></div>
            </form>
          </section>
        </div>
      )}

      {modal === 'logout' && (
        <div className="service-modal-backdrop" onMouseDown={closeModal}>
          <section className="service-modal service-logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="service-modal-header"><div><p>로그아웃 확인</p><h2 id="logout-title">로그아웃할까요?</h2></div><button type="button" onClick={closeModal} aria-label="닫기">×</button></div>
            <p className="service-modal-description">로그아웃하면 다시 로그인해야 서비스를 이용할 수 있습니다.</p>
            <div className="service-form-actions"><button type="button" onClick={closeModal}>아니요</button><button className="service-submit-button" type="button" onClick={onLogout}>예</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
