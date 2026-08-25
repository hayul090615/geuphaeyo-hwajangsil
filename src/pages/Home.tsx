import { FormEvent, useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import ToiletCard from '../components/ToiletCard';
import { getNearbyToilets } from '../services/toiletService';
import type { Toilet } from '../types/toilet';

type ToiletForm = {
  name: string;
  address: string;
  distance: string;
  openAllDay: boolean;
  accessible: boolean;
};

const emptyForm: ToiletForm = {
  name: '',
  address: '',
  distance: '',
  openAllDay: false,
  accessible: false,
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<ToiletForm>(emptyForm);

  useEffect(() => {
    void getNearbyToilets().then(setToilets);
  }, []);

  useEffect(() => {
    if (!isAddOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAddOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isAddOpen]);

  const filtered = useMemo(
    () => toilets.filter((toilet) => `${toilet.name} ${toilet.address}`.includes(query.trim())),
    [toilets, query],
  );

  const addToilet = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const toilet: Toilet = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      address: form.address.trim(),
      distance: form.distance.trim() || '거리 확인 중',
      openAllDay: form.openAllDay,
      accessible: form.accessible,
      latitude: 37.5665,
      longitude: 126.978,
    };
    setToilets((current) => [toilet, ...current]);
    setForm(emptyForm);
    setIsAddOpen(false);
  };

  return (
    <div className="page">
      <div className="top-strip" />
      <div className="app-shell">
        <Header onAddOpen={() => setIsAddOpen(true)} />
        <main>
          <section className="hero">
            <p className="eyebrow">급할 때, 가까운 곳부터</p>
            <h1>지금 있는 곳에서<br /><strong>가까운 화장실</strong>을 찾아보세요.</h1>
            <p className="hero-description">장소를 검색하면 거리와 운영 정보, 접근 가능 여부를 한눈에 비교<br className="desktop-break" />할 수 있어요.</p>
            <SearchBar value={query} onChange={setQuery} />
          </section>

          <section className="service-guide" aria-labelledby="guide-title">
            <div>
              <p className="guide-eyebrow">이용 방법</p>
              <h2 id="guide-title">필요한 정보만 빠르게 확인하세요.</h2>
            </div>
            <ol>
              <li><strong>장소 검색</strong><span>주소나 자주 가는 장소를 입력해 보세요.</span></li>
              <li><strong>정보 비교</strong><span>거리, 운영시간, 접근성 정보를 확인하세요.</span></li>
              <li><strong>목적지 선택</strong><span>지금 이용하기 좋은 화장실을 골라보세요.</span></li>
            </ol>
          </section>

          <section className="toilet-section">
            <div className="section-title">
              <div><h2>주변 화장실</h2><p>거리와 이용 정보를 확인한 뒤 선택하세요.</p></div>
              <span>{filtered.length}곳</span>
            </div>
            <div className="toilet-list">
              {filtered.map((toilet) => <ToiletCard key={toilet.id} toilet={toilet} />)}
            </div>
            {filtered.length === 0 && <p className="empty-result">검색 결과가 없습니다.</p>}
          </section>
        </main>
      </div>

      {isAddOpen && (
        <div className="modal-backdrop" onMouseDown={() => setIsAddOpen(false)}>
          <section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><p>새로운 장소 제보</p><h2 id="add-modal-title">화장실 추가</h2></div>
              <button type="button" onClick={() => setIsAddOpen(false)} aria-label="닫기">×</button>
            </div>
            <p className="modal-description">알고 있는 화장실 정보를 등록해 주세요. 확인 후 주변 화장실 목록에 표시됩니다.</p>
            <form className="add-form" onSubmit={addToilet}>
              <label>화장실 이름<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="예: 시청역 공중화장실" /></label>
              <label>주소<input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="도로명 주소를 입력하세요" /></label>
              <label>현재 위치에서 거리<input value={form.distance} onChange={(event) => setForm({ ...form, distance: event.target.value })} placeholder="예: 300m" /></label>
              <div className="check-row">
                <label><input type="checkbox" checked={form.openAllDay} onChange={(event) => setForm({ ...form, openAllDay: event.target.checked })} /> 24시간 운영</label>
                <label><input type="checkbox" checked={form.accessible} onChange={(event) => setForm({ ...form, accessible: event.target.checked })} /> 장애인 접근 가능</label>
              </div>
              <div className="form-actions">
                <button className="cancel-button" type="button" onClick={() => setIsAddOpen(false)}>취소</button>
                <button className="submit-button" type="submit">화장실 등록</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
