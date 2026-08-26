import { FormEvent, useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import ToiletCard from '../components/ToiletCard';
import { getNearbyToilets } from '../services/toiletService';
import { submitRequest } from '../services/requestService';
import type { Toilet } from '../types/toilet';

type ToiletForm = {
  name: string;
  address: string;
  distance: string;
  facilityType: NonNullable<Toilet['facilityType']>;
  locationDetail: string;
  openAllDay: boolean;
  hours: string;
  genderType: NonNullable<Toilet['genderType']>;
  accessible: boolean;
  babyFacility: boolean;
  verifiedAt: string;
  note: string;
  agreed: boolean;
};

const STORAGE_KEY = 'geuphaeyo-submitted-toilets';
const LAST_SUBMITTED_KEY = 'geuphaeyo-last-submitted-at';
const initialForm = (): ToiletForm => ({
  name: '',
  address: '',
  distance: '',
  facilityType: 'public',
  locationDetail: '',
  openAllDay: false,
  hours: '',
  genderType: 'unknown',
  accessible: false,
  babyFacility: false,
  verifiedAt: new Date().toISOString().slice(0, 10),
  note: '',
  agreed: false,
});

const normalize = (value: string) =>
  value.toLocaleLowerCase('ko-KR').replace(/[\s\-_,.·()]/g, '');

function findDuplicate(items: Toilet[], form: ToiletForm) {
  const name = normalize(form.name);
  const address = normalize(form.address);
  const detail = normalize(form.locationDetail);
  return items.find((item) => {
    const sameName = normalize(item.name) === name;
    const sameAddress = normalize(item.address) === address;
    const savedDetail = normalize(item.locationDetail || '');
    return sameName || (sameAddress && savedDetail === detail);
  });
}

function loadSubmitted(): Toilet[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Toilet[];
  } catch {
    return [];
  }
}

type HomeProps = { onLogout: () => void };

export default function Home({ onLogout }: HomeProps) {
  const [query, setQuery] = useState('');
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<ToiletForm>(initialForm);
  const [formError, setFormError] = useState('');
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestCategory, setRequestCategory] = useState<'feature' | 'data' | 'bug' | 'other'>('feature');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestRecipient, setRequestRecipient] = useState<'hayul9888@gmail.com' | 'sg8111320@gmail.com'>('hayul9888@gmail.com');
  const [requestState, setRequestState] = useState('');
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  useEffect(() => {
    void getNearbyToilets().then((items) => setToilets([...loadSubmitted(), ...items]));
  }, []);

  useEffect(() => {
    if (!isAddOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setIsAddOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isAddOpen]);

  const filtered = useMemo(() => {
    const keyword = normalize(query);
    return toilets.filter((toilet) => normalize(`${toilet.name} ${toilet.address}`).includes(keyword));
  }, [toilets, query]);

  const updateForm = <K extends keyof ToiletForm>(key: K, value: ToiletForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const closeModal = () => {
    setIsAddOpen(false);
    setFormError('');
  };

  const addToilet = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalize(form.name).length < 3 || normalize(form.address).length < 6) {
      setFormError('화장실 이름과 정확한 도로명 주소를 입력해 주세요.');
      return;
    }
    const duplicate = findDuplicate(toilets, form);
    if (duplicate) {
      setFormError(`이미 등록된 화장실과 겹칩니다: ${duplicate.name} (${duplicate.address})`);
      return;
    }
    if (!form.openAllDay && !form.hours.trim()) {
      setFormError('24시간 운영이 아니라면 이용 가능한 시간을 입력해 주세요.');
      return;
    }
    if (!form.agreed) {
      setFormError('등록 규칙을 확인하고 동의해 주세요.');
      return;
    }
    const lastSubmittedAt = Number(localStorage.getItem(LAST_SUBMITTED_KEY) || 0);
    if (Date.now() - lastSubmittedAt < 30_000) {
      setFormError('도배 방지를 위해 등록 후 30초 뒤에 다시 시도할 수 있습니다.');
      return;
    }

    const toilet: Toilet = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      address: form.address.trim(),
      distance: form.distance.trim() || '거리 확인 중',
      facilityType: form.facilityType,
      locationDetail: form.locationDetail.trim(),
      openAllDay: form.openAllDay,
      hours: form.openAllDay ? '24시간' : form.hours.trim(),
      genderType: form.genderType,
      accessible: form.accessible,
      babyFacility: form.babyFacility,
      verifiedAt: form.verifiedAt,
      note: form.note.trim(),
      status: 'pending',
      latitude: 37.5665,
      longitude: 126.978,
    };
    const submitted = [toilet, ...loadSubmitted()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submitted));
    localStorage.setItem(LAST_SUBMITTED_KEY, String(Date.now()));
    setToilets((current) => [toilet, ...current]);
    setForm(initialForm());
    closeModal();
  };

  const sendRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestMessage.trim().length < 10) {
      setRequestState('요청 내용을 10자 이상 입력해 주세요.');
      return;
    }
    setRequestState('전송 중...');
    try {
      await submitRequest({ category: requestCategory, message: requestMessage.trim(), recipientEmail: requestRecipient });
      setRequestState('요청사항이 전달되었습니다.');
      setRequestMessage('');
      setTimeout(() => { setIsRequestOpen(false); setRequestState(''); }, 900);
    } catch (error) {
      setRequestState(error instanceof Error ? error.message : '요청사항을 전송하지 못했습니다.');
    }
  };

  return (
    <div className="page">
      <div className="top-strip" />
      <div className="app-shell">
        <Header onRequestOpen={() => setIsRequestOpen(true)} onAddOpen={() => setIsAddOpen(true)} onLogout={() => setIsLogoutOpen(true)} />
        <main>
          <section className="hero">
            <p className="eyebrow">급할 때, 가까운 곳부터</p>
            <h1>지금 있는 곳에서<br /><strong>가까운 화장실</strong>을 찾아보세요.</h1>
            <p className="hero-description">장소를 검색하면 거리와 운영 정보, 접근 가능 여부를 한눈에 비교<br className="desktop-break" />할 수 있어요.</p>
            <SearchBar value={query} onChange={setQuery} />
          </section>

          <section className="service-guide" aria-labelledby="guide-title">
            <div><p className="guide-eyebrow">이용 방법</p><h2 id="guide-title">필요한 정보만 빠르게 확인하세요.</h2></div>
            <ol>
              <li><strong>장소 검색</strong><span>주소나 자주 가는 장소를 입력해 보세요.</span></li>
              <li><strong>정보 비교</strong><span>거리, 운영시간, 접근성 정보를 확인하세요.</span></li>
              <li><strong>목적지 선택</strong><span>지금 이용하기 좋은 화장실을 골라보세요.</span></li>
            </ol>
          </section>

          <section className="toilet-section">
            <div className="section-title">
              <div><h2>화장실 추천</h2></div>
              <span>{Math.min(filtered.length, 16)}곳</span>
            </div>
            <div className="toilet-list">{filtered.slice(0, 16).map((toilet) => <ToiletCard key={toilet.id} toilet={toilet} />)}</div>
            {filtered.length === 0 && <p className="empty-result">검색 결과가 없습니다.</p>}
          </section>
        </main>
      </div>

      {isAddOpen && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section className="add-modal add-modal-wide" role="dialog" aria-modal="true" aria-labelledby="add-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><p>새로운 장소 제보</p><h2 id="add-modal-title">화장실 추가</h2></div>
              <button type="button" onClick={closeModal} aria-label="닫기">×</button>
            </div>
            <p className="modal-description">정확한 장소와 이용 정보를 알려주세요. 새 제보는 검토 중 상태로 등록됩니다.</p>

            <aside className="submission-rules">
              <strong>등록 규칙</strong>
              <ul>
                <li>직접 확인했거나 신뢰할 수 있는 정보만 등록해 주세요.</li>
                <li>같은 이름 또는 같은 주소·상세 위치의 화장실은 중복 등록할 수 없습니다.</li>
                <li>주거지 내부, 개인 연락처, 출입 비밀번호 등 민감한 정보는 작성하지 마세요.</li>
                <li>허위·광고·장난성 제보는 검토 과정에서 삭제될 수 있습니다.</li>
              </ul>
            </aside>

            <form className="add-form" onSubmit={addToilet}>
              <div className="form-grid">
                <label>화장실 이름 *<input autoFocus required value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="예: 시청역 공중화장실" /></label>
                <label>시설 유형 *
                  <select value={form.facilityType} onChange={(event) => updateForm('facilityType', event.target.value as ToiletForm['facilityType'])}>
                    <option value="public">공중화장실</option><option value="building">건물 내부</option><option value="station">역·터미널</option><option value="park">공원</option><option value="other">기타</option>
                  </select>
                </label>
                <label className="full-field">도로명 주소 *<input required value={form.address} onChange={(event) => updateForm('address', event.target.value)} placeholder="예: 서울 중구 세종대로 110" /></label>
                <label>상세 위치<input value={form.locationDetail} onChange={(event) => updateForm('locationDetail', event.target.value)} placeholder="예: 지하 1층 동쪽 출구 옆" /></label>
                <label>현재 위치에서 거리<input value={form.distance} onChange={(event) => updateForm('distance', event.target.value)} placeholder="예: 300m" /></label>
                <label>운영시간 *<input disabled={form.openAllDay} required={!form.openAllDay} value={form.openAllDay ? '24시간' : form.hours} onChange={(event) => updateForm('hours', event.target.value)} placeholder="예: 09:00~22:00" /></label>
                <label>남녀 구분
                  <select value={form.genderType} onChange={(event) => updateForm('genderType', event.target.value as ToiletForm['genderType'])}>
                    <option value="unknown">확인하지 못함</option><option value="separated">남녀 분리</option><option value="unisex">남녀 공용</option>
                  </select>
                </label>
                <label>마지막 확인일 *<input type="date" required max={new Date().toISOString().slice(0, 10)} value={form.verifiedAt} onChange={(event) => updateForm('verifiedAt', event.target.value)} /></label>
                <label className="full-field">추가 설명<textarea maxLength={300} value={form.note} onChange={(event) => updateForm('note', event.target.value)} placeholder="출입 방법이나 이용 시 참고할 내용을 적어주세요. (300자 이내)" /></label>
              </div>

              <div className="check-row option-checks">
                <label><input type="checkbox" checked={form.openAllDay} onChange={(event) => updateForm('openAllDay', event.target.checked)} /> 24시간 운영</label>
                <label><input type="checkbox" checked={form.accessible} onChange={(event) => updateForm('accessible', event.target.checked)} /> 장애인 접근 가능</label>
                <label><input type="checkbox" checked={form.babyFacility} onChange={(event) => updateForm('babyFacility', event.target.checked)} /> 기저귀 교환대 있음</label>
              </div>

              <label className="rule-agreement"><span>위 등록 규칙을 확인했으며 정확한 정보임에 동의합니다.</span><input type="checkbox" checked={form.agreed} onChange={(event) => updateForm('agreed', event.target.checked)} /></label>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="form-actions">
                <button className="cancel-button" type="button" onClick={closeModal}>취소</button>
                <button className="submit-button" type="submit">검토 요청하기</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isRequestOpen && (
        <div className="modal-backdrop" onMouseDown={() => setIsRequestOpen(false)}>
          <section className="add-modal request-modal" role="dialog" aria-modal="true" aria-labelledby="request-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><p>서비스 의견 보내기</p><h2 id="request-modal-title">요청사항</h2></div>
              <button type="button" onClick={() => setIsRequestOpen(false)} aria-label="닫기">×</button>
            </div>
            <p className="modal-description">불편한 점이나 필요한 기능을 남겨주시면 운영팀에서 확인합니다.</p>
            <form className="add-form" onSubmit={sendRequest}>
              <label>요청 유형
                <select value={requestCategory} onChange={(event) => setRequestCategory(event.target.value as typeof requestCategory)}>
                  <option value="feature">기능 제안</option><option value="data">화장실 정보 수정</option><option value="bug">오류 신고</option><option value="other">기타</option>
                </select>
              </label>
              <label>요청 내용 *<textarea required minLength={10} maxLength={1000} value={requestMessage} onChange={(event) => { setRequestMessage(event.target.value); setRequestState(''); }} placeholder="필요한 내용이나 불편한 점을 자세히 적어주세요." /></label>
              <label>받는 사람 *
                <select required value={requestRecipient} onChange={(event) => setRequestRecipient(event.target.value as typeof requestRecipient)}>
                  <option value="hayul9888@gmail.com">hayul9888@gmail.com</option>
                  <option value="sg8111320@gmail.com">sg8111320@gmail.com</option>
                </select>
              </label>
              {requestState && <p className="request-status" role="status">{requestState}</p>}
              <div className="form-actions">
                <button className="cancel-button" type="button" onClick={() => setIsRequestOpen(false)}>취소</button>
                <button className="submit-button" type="submit">운영팀에 보내기</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isLogoutOpen && (
        <div className="modal-backdrop" onMouseDown={() => setIsLogoutOpen(false)}>
          <section className="add-modal logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><p>로그아웃 확인</p><h2 id="logout-modal-title">로그아웃할까요?</h2></div>
              <button type="button" onClick={() => setIsLogoutOpen(false)} aria-label="닫기">×</button>
            </div>
            <p className="modal-description">로그아웃하면 다시 로그인해야 서비스를 이용할 수 있습니다.</p>
            <div className="logout-confirm-actions">
              <button className="cancel-button" type="button" onClick={() => setIsLogoutOpen(false)}>아니요</button>
              <button className="submit-button" type="button" onClick={onLogout}>예</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
