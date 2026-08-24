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

  useEffect(() => {
    void getNearbyToilets().then(setToilets);
  }, []);

  const filtered = useMemo(
    () => toilets.filter((toilet) => `${toilet.name} ${toilet.address}`.includes(query)),
    [toilets, query],
  );

  return (
    <div className="app-shell">
      <Header />
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

        <section className="content-grid">
          <div>
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
          </div>
          <Map toilets={filtered} />
        </section>
      </main>
    </div>
  );
}
