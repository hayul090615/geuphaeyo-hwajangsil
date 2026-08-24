import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import ToiletCard from '../components/ToiletCard';
import { getNearbyToilets } from '../services/toiletService';
import type { Toilet } from '../types/toilet';

export default function Home() {
  const [query, setQuery] = useState('');
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);

  useEffect(() => {
    void getNearbyToilets().then(setToilets);
  }, []);

  const filtered = useMemo(
    () => toilets.filter((toilet) => `${toilet.name} ${toilet.address}`.includes(query)),
    [toilets, query],
  );

  return (
    <div className="app-shell">
      <Header onMapOpen={() => setIsMapOpen(true)} />
      <main>
        <section className="hero">
          <p className="eyebrow">급할 때, 가까운 곳부터</p>
          <h1>
            지금 있는 곳에서<br />
            <strong>가까운 화장실</strong>을 찾아보세요.
          </h1>
          <p className="hero-description">
            장소를 검색하면 거리와 운영 정보, 접근 가능 여부를 한눈에 비교할 수 있어요.
          </p>
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
            <div>
              <h2>주변 화장실</h2>
              <p>거리와 이용 정보를 확인한 뒤 선택하세요.</p>
            </div>
            <span>{filtered.length}곳</span>
          </div>
          <div className="toilet-list">
            {filtered.map((toilet) => <ToiletCard key={toilet.id} toilet={toilet} />)}
          </div>
        </section>

        <section className="support-section" aria-labelledby="support-title">
          <div className="support-heading">
            <p>이용 전 확인하세요</p>
            <h2 id="support-title">급한 순간에도 필요한 정보는 놓치지 않도록</h2>
            <span>목적지에 도착하기 전, 아래 정보를 한 번 더 확인해 보세요.</span>
          </div>
          <ul className="support-list">
            <li><strong>운영시간</strong><span>시설별 운영시간은 상황에 따라 달라질 수 있어요.</span></li>
            <li><strong>접근성 정보</strong><span>휠체어 이용 등 필요한 시설 정보를 미리 확인하세요.</span></li>
            <li><strong>현장 이용</strong><span>청소나 점검 중일 수 있으니 도착 후에도 확인해 주세요.</span></li>
          </ul>
        </section>
      </main>

      <footer className="site-footer">
        <p><strong>급해요화장실</strong> · 가까운 화장실 정보를 빠르게 찾는 서비스</p>
        <span>필요한 순간에, 필요한 정보만.</span>
      </footer>

      {isMapOpen && (
        <div className="map-modal-backdrop" onClick={() => setIsMapOpen(false)}>
          <section className="map-modal" role="dialog" aria-modal="true" aria-labelledby="map-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="map-modal-header">
              <div>
                <p>지도에서 확인하기</p>
                <h2 id="map-modal-title">주변 화장실 위치</h2>
              </div>
              <button type="button" onClick={() => setIsMapOpen(false)} aria-label="지도 닫기">×</button>
            </div>
            <Map toilets={filtered} />
          </section>
        </div>
      )}
    </div>
  );
}
