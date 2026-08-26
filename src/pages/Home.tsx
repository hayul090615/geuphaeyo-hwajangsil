import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import { getNearbyToilets } from '../services/toiletService';
import type { Toilet } from '../types/toilet';

export default function Home() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('toilet-map-theme');
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    void getNearbyToilets().then(setToilets);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('toilet-map-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <div className="map-home">
      <Header isDarkMode={isDarkMode} onThemeToggle={() => setIsDarkMode((current) => !current)} />
      <main className="map-home-main">
        <section className="map-home-toolbar" aria-label="화장실 검색">
          <SearchBar value={query} onChange={setQuery} onSubmit={setSubmittedQuery} />
        </section>
        <Map toilets={toilets} query={submittedQuery} />

      </main>
    </div>
  );
}
