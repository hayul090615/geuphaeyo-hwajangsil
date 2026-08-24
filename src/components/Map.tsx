import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as KakaoMap,
  MapMarker,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import type { Toilet } from '../types/toilet';

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY?.trim();
const DEFAULT_POSITION = { lat: 37.566826, lng: 126.978657 };
const TOILET_SEARCH_KEYWORDS = ['공중화장실', '개방화장실', '공공화장실', '화장실'];
const SEARCH_PAGE_COUNT = 3;

type Position = { lat: number; lng: number };
type MapToilet = Position & { id: string; name: string; address: string; distance?: string };
type MapProps = { toilets: Toilet[] };

function formatDistance(distance?: string) {
  if (!distance) return undefined;
  const meters = Number(distance);
  if (Number.isNaN(meters)) return undefined;
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}

function toMapToilet(place: kakao.maps.services.PlacesSearchResultItem): MapToilet {
  return {
    id: place.id,
    name: place.place_name,
    address: place.road_address_name || place.address_name,
    distance: formatDistance(place.distance),
    lat: Number(place.y),
    lng: Number(place.x),
  };
}

function Map({ toilets }: MapProps) {
  if (!KAKAO_MAP_KEY) {
    return (
      <div className="map-feedback" role="alert">
        <strong>카카오 지도 키가 필요합니다.</strong>
        <span>.env 파일에 VITE_KAKAO_MAP_KEY를 설정하고 개발 서버를 다시 시작해 주세요.</span>
      </div>
    );
  }

  return <LoadedMap appKey={KAKAO_MAP_KEY} toilets={toilets} />;
}

function LoadedMap({ appKey, toilets }: MapProps & { appKey: string }) {
  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ['services'],
  });
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [nearbyToilets, setNearbyToilets] = useState<MapToilet[]>([]);
  const [selectedToiletId, setSelectedToiletId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('현재 위치를 확인하는 중입니다.');
  const requestedLocation = useRef(false);
  const searchSequence = useRef(0);
  const searchTimer = useRef<number | null>(null);

  const fallbackToilets = useMemo<MapToilet[]>(() => toilets.map((toilet) => ({
    id: `mock-${toilet.id}`,
    name: toilet.name,
    address: toilet.address,
    distance: toilet.distance,
    lat: toilet.latitude,
    lng: toilet.longitude,
  })), [toilets]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatusMessage('이 브라우저에서는 현재 위치를 사용할 수 없어 서울시청 주변을 표시합니다.');
      return;
    }

    setStatusMessage('현재 위치를 확인하는 중입니다.');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentPosition({ lat: coords.latitude, lng: coords.longitude });
        setStatusMessage('현재 위치 주변의 화장실을 찾는 중입니다.');
      },
      () => setStatusMessage('위치 권한이 없어 현재 지도 영역의 화장실을 검색합니다.'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (requestedLocation.current) return;
    requestedLocation.current = true;
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  const searchMapBounds = useCallback(async () => {
    if (!map || !window.kakao?.maps?.services) return;

    const requestId = ++searchSequence.current;
    const places = new kakao.maps.services.Places();
    const bounds = map.getBounds();
    const location = map.getCenter();
    setStatusMessage('현재 지도 영역의 화장실을 최대한 많이 찾는 중입니다.');

    const searchPage = (keyword: string, page: number) => new Promise<kakao.maps.services.PlacesSearchResult>((resolve, reject) => {
      places.keywordSearch(
        keyword,
        (result, status) => {
          if (status === kakao.maps.services.Status.OK) {
            resolve(result);
            return;
          }
          if (status === kakao.maps.services.Status.ZERO_RESULT) {
            resolve([]);
            return;
          }
          reject(new Error(`카카오 장소 검색 실패: ${keyword} ${page}페이지`));
        },
        {
          bounds,
          location,
          page,
          size: 15,
          sort: kakao.maps.services.SortBy.DISTANCE,
        },
      );
    });

    const searches = TOILET_SEARCH_KEYWORDS.flatMap((keyword) =>
      Array.from({ length: SEARCH_PAGE_COUNT }, (_, index) => searchPage(keyword, index + 1)),
    );
    const results = await Promise.allSettled(searches);
    if (requestId !== searchSequence.current) return;

    const uniquePlaces = new globalThis.Map<string, MapToilet>();
    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      result.value.forEach((place) => {
        if (!uniquePlaces.has(place.id)) uniquePlaces.set(place.id, toMapToilet(place));
      });
    });

    const foundToilets = Array.from(uniquePlaces.values());
    setNearbyToilets(foundToilets);
    setSelectedToiletId((current) => current && uniquePlaces.has(current) ? current : null);

    const failedSearchCount = results.filter((result) => result.status === 'rejected').length;
    if (foundToilets.length > 0) {
      setStatusMessage(
        failedSearchCount > 0
          ? `화장실 ${foundToilets.length}곳을 찾았습니다. 일부 검색은 완료되지 않았습니다.`
          : `현재 지도 영역에서 화장실 ${foundToilets.length}곳을 찾았습니다.`,
      );
      return;
    }

    setStatusMessage(
      failedSearchCount === results.length
        ? '화장실 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        : '현재 지도 영역에서 등록된 화장실을 찾지 못했습니다.',
    );
  }, [map]);

  const scheduleMapSearch = useCallback(() => {
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      void searchMapBounds();
    }, 350);
  }, [searchMapBounds]);

  useEffect(() => {
    if (map) scheduleMapSearch();
    return () => {
      if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    };
  }, [map, scheduleMapSearch]);

  if (loading) return <div className="map-feedback">카카오 지도를 불러오는 중입니다.</div>;

  if (error) {
    return (
      <div className="map-feedback" role="alert">
        <strong>카카오 지도를 불러오지 못했습니다.</strong>
        <span>카카오 Developers의 JavaScript SDK 도메인에 {window.location.origin}이 등록되어 있는지 확인해 주세요.</span>
      </div>
    );
  }

  const visibleToilets = nearbyToilets.length > 0 ? nearbyToilets : fallbackToilets;
  const center = currentPosition ?? DEFAULT_POSITION;

  const focusToilet = (toilet: MapToilet) => {
    setSelectedToiletId(toilet.id);
    map?.panTo(new kakao.maps.LatLng(toilet.lat, toilet.lng));
  };

  return (
    <section className="kakao-map-wrap" aria-label="현재 지도 영역의 화장실 지도">
      <div className="map-status" role="status">
        <div>
          <span>{statusMessage}</span>
          <small>지도를 이동하거나 확대하면 해당 영역을 자동으로 다시 검색합니다.</small>
        </div>
        <div className="map-status-actions">
          <button type="button" onClick={() => void searchMapBounds()}>이 지역 다시 검색</button>
          <button type="button" onClick={requestCurrentLocation}>현재 위치</button>
        </div>
      </div>
      <div className="map-content">
        <KakaoMap
          center={center}
          className="kakao-map"
          level={5}
          onCreate={setMap}
          onIdle={scheduleMapSearch}
        >
          {currentPosition && (
            <MapMarker position={currentPosition} title="현재 위치">
              <div className="map-current-label">현재 위치</div>
            </MapMarker>
          )}

          {visibleToilets.map((toilet) => (
            <MapMarker
              key={toilet.id}
              position={{ lat: toilet.lat, lng: toilet.lng }}
              title={toilet.name}
              onClick={() => setSelectedToiletId((current) => current === toilet.id ? null : toilet.id)}
            >
              {selectedToiletId === toilet.id && (
                <div className="map-place-info">
                  <strong>{toilet.name}</strong>
                  <span>{toilet.address}</span>
                  {toilet.distance && <em>{toilet.distance}</em>}
                </div>
              )}
            </MapMarker>
          ))}
        </KakaoMap>

        <aside className="map-result-panel" aria-label="화장실 위치 목록">
          <div className="map-result-heading">
            <strong>화장실 위치</strong>
            <span>{visibleToilets.length}곳</span>
          </div>
          <div className="map-result-list">
            {visibleToilets.map((toilet, index) => (
              <button
                className={selectedToiletId === toilet.id ? 'map-result-item is-selected' : 'map-result-item'}
                key={toilet.id}
                type="button"
                onClick={() => focusToilet(toilet)}
                aria-pressed={selectedToiletId === toilet.id}
              >
                <span className="map-result-number">{index + 1}</span>
                <span className="map-result-copy">
                  <strong>{toilet.name}</strong>
                  <span>{toilet.address}</span>
                </span>
                {toilet.distance && <em>{toilet.distance}</em>}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Map;
