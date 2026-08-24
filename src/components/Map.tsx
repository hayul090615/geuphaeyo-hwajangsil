import type { Toilet } from '../types/toilet';

export default function Map({ toilets }: { toilets: Toilet[] }) {
  return (
    <section className="map-panel" aria-label="화장실 위치 지도">
      <div className="map-grid" />
      <div className="map-label">내 주변 화장실</div>
      {toilets.map((toilet, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);

        return (
          <span
            className="map-pin"
            style={{ left: `${16 + column * 22}%`, top: `${18 + row * 20}%` }}
            key={toilet.id}
          >
            ⌖
          </span>
        );
      })}
      <span className="map-user">●</span>
    </section>
  );
}
