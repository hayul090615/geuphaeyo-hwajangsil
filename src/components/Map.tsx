import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as KakaoMap,
  MapMarker,
  MarkerClusterer,
  Polyline,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import type { Toilet } from '../types/toilet';
import { getDirections } from '../services/directionsService';
import type { DirectionsMode, DirectionsRoute } from '../services/directionsService';

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY?.trim();
const DEFAULT_POSITION = { lat: 37.566826, lng: 126.978657 };
const TOILET_SEARCH_KEYWORDS = [
  '공중화장실',
  '개방화장실',
  '공공화장실',
  '화장실',
  '지하철 화장실',
  '공원 화장실',
  '주민센터 화장실',
];
const SEARCH_PAGE_COUNT = 2;
const WIDE_SEARCH_GRID_SIZE = 3;
const NEARBY_SEARCH_GRID_SIZE = 2;
const SEARCH_CONCURRENCY = 6;
const SEOUL_MAP_LEVEL = 8;
const NEARBY_MAP_LEVEL = 5;
const LONG_DISTANCE_CAR_THRESHOLD_METERS = 20_000;
const DIRECTIONS_MODES: { mode: DirectionsMode; label: string; icon: string }[] = [
  { mode: 'walk', label: '도보', icon: '🚶' },
  { mode: 'bicycle', label: '자전거', icon: '🚲' },
  { mode: 'car', label: '자동차', icon: '🚗' },
];

type Position = { lat: number; lng: number; accuracy?: number };
type MapToilet = Position & {
  id: string;
  name: string;
  address: string;
  distance?: string;
  phone?: string;
  category?: string;
  openAllDay?: boolean;
  accessible?: boolean;
};
type RouteInfo = DirectionsRoute;
type MapProps = { toilets: Toilet[]; query?: string };

function formatDistance(distance?: string) {
  if (!distance) return undefined;
  const meters = Number(distance);
  if (Number.isNaN(meters)) return undefined;
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

function toMapToilet(place: kakao.maps.services.PlacesSearchResultItem): MapToilet {
  return {
    id: place.id,
    name: place.place_name,
    address: place.road_address_name || place.address_name,
    distance: formatDistance(place.distance),
    lat: Number(place.y),
    lng: Number(place.x),
    phone: place.phone || undefined,
    category: place.category_name.split(' > ').pop(),
  };
}

function splitBounds(bounds: kakao.maps.LatLngBounds, gridSize: number) {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const latitudeStep = (northEast.getLat() - southWest.getLat()) / gridSize;
  const longitudeStep = (northEast.getLng() - southWest.getLng()) / gridSize;

  return Array.from({ length: gridSize ** 2 }, (_, index) => {
    const row = Math.floor(index / gridSize);
    const column = index % gridSize;
    const cellSouthWest = new kakao.maps.LatLng(
      southWest.getLat() + latitudeStep * row,
      southWest.getLng() + longitudeStep * column,
    );
    const cellNorthEast = new kakao.maps.LatLng(
      southWest.getLat() + latitudeStep * (row + 1),
      southWest.getLng() + longitudeStep * (column + 1),
    );

    return new kakao.maps.LatLngBounds(cellSouthWest, cellNorthEast);
  });
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `약 ${minutes}분`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes > 0 ? `약 ${hours}시간 ${remainingMinutes}분` : `약 ${hours}시간`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `약 ${days}일 ${remainingHours}시간` : `약 ${days}일`;
}

function getDistanceMeters(origin: Position, destination: Position) {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const destinationLatitude = toRadians(destination.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getRecommendedDirectionsMode(origin: Position, destination: Position): DirectionsMode {
  return getDistanceMeters(origin, destination) >= LONG_DISTANCE_CAR_THRESHOLD_METERS ? 'car' : 'walk';
}

function Map({ toilets, query }: MapProps) {
  if (!KAKAO_MAP_KEY) {
    return (
      <div className="map-feedback" role="alert">
        <strong>카카오 지도 키가 필요합니다.</strong>
        <span>.env 파일에 VITE_KAKAO_MAP_KEY를 설정하고 개발 서버를 다시 시작해 주세요.</span>
      </div>
    );
  }

  return <LoadedMap appKey={KAKAO_MAP_KEY} toilets={toilets} query={query} />;
}

function LoadedMap({ appKey, toilets, query = '' }: MapProps & { appKey: string }) {
  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ['services', 'clusterer'],
  });
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [mapLevel, setMapLevel] = useState(SEOUL_MAP_LEVEL);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [nearbyToilets, setNearbyToilets] = useState<MapToilet[]>([]);
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
  const [selectedToiletId, setSelectedToiletId] = useState<string | null>(null);
  const [directionsTarget, setDirectionsTarget] = useState<MapToilet | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeMessage, setRouteMessage] = useState('');
  const [directionsMode, setDirectionsMode] = useState<DirectionsMode>('walk');
  const [isSkyview, setIsSkyview] = useState(false);
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);
  const [statusMessage, setStatusMessage] = useState('서울 중심의 화장실을 찾는 중입니다.');
  const searchSequence = useRef(0);
  const searchTimer = useRef<number | null>(null);
  const directionsTargetRef = useRef<MapToilet | null>(null);
  const directionsSequence = useRef(0);

  const fallbackToilets = useMemo<MapToilet[]>(() => toilets.map((toilet) => ({
    id: `mock-${toilet.id}`,
    name: toilet.name,
    address: toilet.address,
    distance: toilet.distance,
    lat: toilet.latitude,
    lng: toilet.longitude,
    category: '공공 화장실',
    openAllDay: toilet.openAllDay,
    accessible: toilet.accessible,
  })), [toilets]);

  const requestCurrentLocation = useCallback((
    onLocated?: (position: Position) => void,
    onLocationError?: (message: string) => void,
  ) => {
    if (!navigator.geolocation) {
      const message = '이 브라우저에서는 현재 위치를 사용할 수 없습니다. 출발 위치를 지도에서 직접 선택해 주세요.';
      setStatusMessage(message);
      onLocationError?.(message);
      return;
    }

    setStatusMessage('현재 위치를 확인하는 중입니다.');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
        searchSequence.current += 1;
        setCurrentPosition(position);
        setNearbyToilets([]);
        setHasCompletedSearch(true);
        setSelectedToiletId(null);
        setMapLevel(NEARBY_MAP_LEVEL);
        setStatusMessage('현재 위치 주변의 화장실을 찾는 중입니다.');
        onLocated?.(position);
      },
      (locationError) => {
        const message = locationError.code === locationError.PERMISSION_DENIED
          ? '위치 권한이 차단되었습니다. 브라우저 권한을 허용하거나 출발 위치를 지도에서 직접 선택해 주세요.'
          : locationError.code === locationError.TIMEOUT
            ? '현재 위치 확인 시간이 초과되었습니다. 다시 시도하거나 출발 위치를 지도에서 직접 선택해 주세요.'
            : '현재 위치를 확인하지 못했습니다. 출발 위치를 지도에서 직접 선택해 주세요.';
        setStatusMessage(message);
        onLocationError?.(message);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }, []);

  const searchMapBounds = useCallback(async () => {
    if (!map || !window.kakao?.maps?.services || directionsTargetRef.current) return;

    const requestId = ++searchSequence.current;
    const places = new kakao.maps.services.Places();
    const bounds = map.getBounds();
    const isWideSearch = map.getLevel() >= 7;
    const gridSize = isWideSearch ? WIDE_SEARCH_GRID_SIZE : NEARBY_SEARCH_GRID_SIZE;
    const searchKeywords = isWideSearch ? TOILET_SEARCH_KEYWORDS.slice(0, 4) : TOILET_SEARCH_KEYWORDS;
    const searchBounds = splitBounds(bounds, gridSize);
    setStatusMessage('현재 지도 영역의 화장실을 최대한 많이 찾는 중입니다.');

    const searchPage = (keyword: string, cellBounds: kakao.maps.LatLngBounds, page: number) => new Promise<kakao.maps.services.PlacesSearchResult>((resolve, reject) => {
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
          bounds: cellBounds,
          page,
          size: 15,
        },
      );
    });

    const searchTasks = Array.from(
      { length: SEARCH_PAGE_COUNT },
      (_, index) => index + 1,
    ).flatMap((page) =>
      searchBounds.flatMap((cellBounds) =>
        searchKeywords.map((keyword) => () => searchPage(keyword, cellBounds, page)),
      ),
    );
    const results: PromiseSettledResult<kakao.maps.services.PlacesSearchResult>[] = [];
    for (let index = 0; index < searchTasks.length; index += SEARCH_CONCURRENCY) {
      if (requestId !== searchSequence.current) return;
      const batch = searchTasks.slice(index, index + SEARCH_CONCURRENCY);
      results.push(...await Promise.allSettled(batch.map((search) => search())));
    }
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
    setHasCompletedSearch(true);
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
  useEffect(() => {
    const regionQuery = query.replace(/화장실/g, ' ').trim();
    if (!map || !window.kakao?.maps?.services || !regionQuery || directionsTargetRef.current) return;

    const timer = window.setTimeout(() => {
      if (directionsTargetRef.current) return;
      const requestId = ++searchSequence.current;
      const places = new kakao.maps.services.Places();
      setStatusMessage(`${regionQuery} 지역의 화장실을 찾는 중입니다.`);

      places.keywordSearch(
        `${regionQuery} 화장실`,
        (result, status) => {
          if (requestId !== searchSequence.current) return;

          if (status !== kakao.maps.services.Status.OK || result.length === 0) {
            setNearbyToilets([]);
            setHasCompletedSearch(true);
            setSelectedToiletId(null);
            setStatusMessage(`${regionQuery} 지역에서 화장실을 찾지 못했습니다.`);
            return;
          }

          const uniquePlaces = new globalThis.Map<string, MapToilet>();
          result.forEach((place) => {
            if (!uniquePlaces.has(place.id)) uniquePlaces.set(place.id, toMapToilet(place));
          });
          const foundToilets = Array.from(uniquePlaces.values());
          const resultBounds = new kakao.maps.LatLngBounds();
          foundToilets.forEach((toilet) => {
            resultBounds.extend(new kakao.maps.LatLng(toilet.lat, toilet.lng));
          });

          setNearbyToilets(foundToilets);
          setHasCompletedSearch(true);
          setSelectedToiletId(null);
          setStatusMessage(`${regionQuery} 지역에서 화장실 ${foundToilets.length}곳을 우선 찾았습니다.`);
          map.setBounds(resultBounds, 60, 60, 60, 60);
        },
        { size: 15 },
      );
    }, 250);

    return () => window.clearTimeout(timer);
  }, [map, query]);

  if (loading) return <div className="map-feedback">카카오 지도를 불러오는 중입니다.</div>;

  if (error) {
    return (
      <div className="map-feedback" role="alert">
        <strong>카카오 지도를 불러오지 못했습니다.</strong>
        <span>카카오 Developers의 JavaScript SDK 도메인에 {window.location.origin}이 등록되어 있는지 확인해 주세요.</span>
      </div>
    );
  }

  const availableToilets = hasCompletedSearch ? nearbyToilets : fallbackToilets;
  const visibleToilets = availableToilets;
  const displayedToilets = directionsTarget ? [directionsTarget] : visibleToilets;
  const center = currentPosition ?? DEFAULT_POSITION;

  const focusToilet = (toilet: MapToilet) => {
    setSelectedToiletId(toilet.id);
    map?.panTo(new kakao.maps.LatLng(toilet.lat, toilet.lng));
  };

  const focusSeoul = () => {
    searchSequence.current += 1;
    setCurrentPosition(null);
    setNearbyToilets([]);
    setHasCompletedSearch(false);
    setSelectedToiletId(null);
    setMapLevel(SEOUL_MAP_LEVEL);
    setStatusMessage('서울 중심의 화장실을 다시 찾는 중입니다.');
    map?.setLevel(SEOUL_MAP_LEVEL);
    map?.panTo(new kakao.maps.LatLng(DEFAULT_POSITION.lat, DEFAULT_POSITION.lng));
  };

  const loadDirections = async (origin: Position, toilet: MapToilet, mode: DirectionsMode) => {
    const requestId = ++directionsSequence.current;
    setRouteInfo(null);
    const modeLabel = DIRECTIONS_MODES.find((item) => item.mode === mode)?.label ?? '선택한 수단';
    setRouteMessage(`${modeLabel} 경로를 계산하는 중입니다.`);

    const fitRoute = (path: DirectionsRoute['path']) => {
      if (!map || path.length === 0) return;
      const bounds = new kakao.maps.LatLngBounds();
      path.forEach((point) => bounds.extend(new kakao.maps.LatLng(point.latitude, point.longitude)));
      map.setBounds(bounds, 70, 70, 70, 70);
    };

    try {
      const route = await getDirections({
        origin: { latitude: origin.lat, longitude: origin.lng },
        destination: { latitude: toilet.lat, longitude: toilet.lng, name: toilet.name },
        mode,
      });
      if (requestId !== directionsSequence.current) return;
      setRouteInfo(route);
      const snappedOrigin = route.path[0];
      const snapDistance = snappedOrigin
        ? getDistanceMeters(origin, { lat: snappedOrigin.latitude, lng: snappedOrigin.longitude })
        : 0;
      const accuracyNotice = origin.accuracy !== undefined && origin.accuracy >= 30
        ? ` GPS 오차 범위는 약 ${Math.round(origin.accuracy)}m입니다.`
        : '';
      setRouteMessage(
        snapDistance >= 50
          ? `출발점이 약 ${Math.round(snapDistance)}m 떨어진 도로에 연결됐습니다. 실제 출입구가 다르면 출발 위치를 조정해 주세요.${accuracyNotice}`
          : `${modeLabel} 추천 최적 경로를 표시하고 있습니다.${accuracyNotice}`,
      );
      fitRoute(route.path);
    } catch (error) {
      if (requestId !== directionsSequence.current) return;
      setRouteInfo(null);
      setRouteMessage(
        error instanceof Error
          ? error.message
          : `${modeLabel} 경로를 불러오지 못했습니다.`,
      );
    }
  };

  const startDirections = (toilet: MapToilet) => {
    searchSequence.current += 1;
    directionsTargetRef.current = toilet;
    setDirectionsTarget(toilet);
    setIsSelectingOrigin(false);
    setSelectedToiletId(toilet.id);
    setRouteMessage('현재 위치를 확인하는 중입니다.');
    map?.panTo(new kakao.maps.LatLng(toilet.lat, toilet.lng));

    const loadRecommendedDirections = (origin: Position) => {
      const recommendedMode = getRecommendedDirectionsMode(origin, toilet);
      setDirectionsMode(recommendedMode);
      void loadDirections(origin, toilet, recommendedMode);
    };

    requestCurrentLocation(
      (origin) => {
        if (directionsTargetRef.current?.id !== toilet.id) return;
        if (origin.accuracy !== undefined && origin.accuracy > 150) {
          setIsSelectingOrigin(true);
          setRouteMessage(`GPS 오차 범위가 약 ${Math.round(origin.accuracy)}m로 큽니다. 지도에서 실제 출입구나 도로를 선택해 주세요.`);
          return;
        }
        loadRecommendedDirections(origin);
      },
      (message) => {
        if (directionsTargetRef.current?.id === toilet.id) {
          setRouteMessage(message);
        }
      },
    );
  };

  const changeDirectionsMode = (mode: DirectionsMode) => {
    setDirectionsMode(mode);
    if (isSelectingOrigin) {
      setRouteMessage('이동수단을 변경했습니다. 지도에서 실제 출발 위치를 선택해 주세요.');
      return;
    }
    if (currentPosition && directionsTarget) {
      void loadDirections(currentPosition, directionsTarget, mode);
      return;
    }
    setRouteMessage('현재 위치 권한을 허용해야 실제 경로를 검색할 수 있습니다.');
  };

  const stopDirections = () => {
    directionsSequence.current += 1;
    directionsTargetRef.current = null;
    setDirectionsTarget(null);
    setIsSelectingOrigin(false);
    setRouteInfo(null);
    setRouteMessage('');
    setSelectedToiletId(null);
    setMapLevel(NEARBY_MAP_LEVEL);
    setStatusMessage('현재 위치 주변의 화장실을 다시 찾는 중입니다.');
    map?.setLevel(NEARBY_MAP_LEVEL);
    map?.panTo(new kakao.maps.LatLng(center.lat, center.lng));
    scheduleMapSearch();
  };

  const toggleSkyview = () => {
    const nextSkyview = !isSkyview;
    setIsSkyview(nextSkyview);
    map?.setMapTypeId(nextSkyview ? kakao.maps.MapTypeId.HYBRID : kakao.maps.MapTypeId.ROADMAP);
  };

  const beginOriginSelection = () => {
    directionsSequence.current += 1;
    setRouteInfo(null);
    setIsSelectingOrigin(true);
    setRouteMessage('지도에서 실제로 통행 가능한 출입구나 도로를 선택해 주세요.');
  };

  const selectOriginOnMap = (_: kakao.maps.Map, mouseEvent: kakao.maps.event.MouseEvent) => {
    if (!isSelectingOrigin || !directionsTarget) return;

    const selectedOrigin: Position = {
      lat: mouseEvent.latLng.getLat(),
      lng: mouseEvent.latLng.getLng(),
      accuracy: 0,
    };
    setCurrentPosition(selectedOrigin);
    setIsSelectingOrigin(false);
    void loadDirections(selectedOrigin, directionsTarget, directionsMode);
  };

  return (
    <>
      <div className={`map-status${directionsTarget ? ' has-directions' : ''}`} role="status">
        <div>
          {directionsTarget ? (
            <>
              <span className="map-directions-label">길찾기 중 · {directionsTarget.name}</span>
              <div className="directions-mode-row">
                <div className="directions-mode-tabs" role="group" aria-label="이동수단 선택">
                  {DIRECTIONS_MODES.map((item) => (
                    <button
                      className={directionsMode === item.mode ? 'is-active' : ''}
                      key={item.mode}
                      type="button"
                      onClick={() => changeDirectionsMode(item.mode)}
                      aria-pressed={directionsMode === item.mode}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
                {routeInfo && (
                  <div className="map-route-metrics">
                    <strong className="map-route-duration" aria-label={`예상 소요 시간 ${formatDuration(routeInfo.durationSeconds)}`}>
                      {formatDuration(routeInfo.durationSeconds)}
                    </strong>
                    <span className="map-route-distance" aria-label={`목적지까지 거리 ${formatDistance(String(routeInfo.distanceMeters))}`}>
                      {formatDistance(String(routeInfo.distanceMeters))}
                    </span>
                  </div>
                )}
              </div>
              <small>{routeMessage}</small>
              {routeInfo?.fareWon !== undefined && (
                <div className="map-route-summary">
                  <em>{routeInfo.fareWon.toLocaleString('ko-KR')}원</em>
                </div>
              )}
            </>
          ) : (
            <>
              <span>{statusMessage}</span>
              <small>지도를 이동하거나 확대하면 해당 영역을 자동으로 다시 검색합니다.</small>
            </>
          )}
        </div>
        <div className="map-status-actions">
          {directionsTarget ? (
            <>
              <button type="button" onClick={beginOriginSelection} disabled={isSelectingOrigin}>
                {isSelectingOrigin ? '지도에서 선택 중' : '출발 위치 조정'}
              </button>
              <button type="button" onClick={toggleSkyview}>{isSkyview ? '일반지도' : '위성뷰'}</button>
              <button type="button" onClick={stopDirections}>길찾기 종료</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => void searchMapBounds()}>이 지역 다시 검색</button>
              <button type="button" onClick={focusSeoul}>서울 중심</button>
              <button type="button" onClick={() => requestCurrentLocation()}>현재 위치</button>
              <button type="button" onClick={toggleSkyview}>{isSkyview ? '일반지도' : '위성뷰'}</button>
            </>
          )}
        </div>
      </div>
      <section className={`kakao-map-wrap${isSelectingOrigin ? ' is-selecting-origin' : ''}`} aria-label="현재 지도 영역의 화장실 지도">
        <div className="map-content">
          <KakaoMap
            center={center}
            className="kakao-map"
            level={mapLevel}
            onCreate={setMap}
            onIdle={scheduleMapSearch}
            onClick={selectOriginOnMap}
          >
            {currentPosition && (
              <MapMarker position={currentPosition} title={currentPosition.accuracy === 0 ? '선택한 출발점' : '현재 위치'}>
                <div className="map-current-label">{currentPosition.accuracy === 0 ? '선택한 출발점' : '현재 위치'}</div>
              </MapMarker>
            )}

            {routeInfo && (
              <Polyline
                path={routeInfo.path.map((point) => ({ lat: point.latitude, lng: point.longitude }))}
                strokeWeight={6}
                strokeColor="#ff5d4c"
                strokeOpacity={0.9}
                strokeStyle="solid"
              />
            )}

            <MarkerClusterer averageCenter minLevel={7}>
              {displayedToilets.map((toilet) => (
                <MapMarker
                  key={toilet.id}
                  position={{ lat: toilet.lat, lng: toilet.lng }}
                  title={toilet.name}
                  onClick={() => setSelectedToiletId((current) => directionsTarget ? toilet.id : current === toilet.id ? null : toilet.id)}
                >
                  {selectedToiletId === toilet.id && (
                    <div className="map-place-info">
                      <strong>{toilet.name}</strong>
                      <span>{toilet.address}</span>
                      <p className="map-place-description">
                        {toilet.category || '화장실'}로 등록된 시설입니다. 운영시간과 현장 편의시설은 방문 전 전화 또는 현장 안내로 확인해 주세요.
                      </p>
                      <div className="map-place-meta">
                        {toilet.category && <span>{toilet.category}</span>}
                        {toilet.distance && <em>{toilet.distance}</em>}
                        {toilet.openAllDay !== undefined && <span>{toilet.openAllDay ? '24시간 운영' : '운영시간 확인 필요'}</span>}
                        {toilet.accessible && <span>휠체어 접근 가능</span>}
                      </div>
                      {toilet.phone && <a href={`tel:${toilet.phone}`}>{toilet.phone}</a>}
                      {!directionsTarget && (
                        <button type="button" className="map-direction-button" onClick={(event) => { event.stopPropagation(); startDirections(toilet); }}>
                          길찾기 시작
                        </button>
                      )}
                    </div>
                  )}
                </MapMarker>
              ))}
            </MarkerClusterer>
          </KakaoMap>

          <aside className="map-result-panel" aria-label="화장실 위치 목록">
            <div className="map-result-heading">
              <strong>{directionsTarget ? '길찾기 목적지' : '화장실 위치'}</strong>
              <span>{displayedToilets.length}곳</span>
            </div>
            <div className="map-result-list">
              {directionsTarget ? (
                <section className="route-guide" aria-label="경로 상세 안내">
                  <strong>{directionsTarget.name}</strong>
                  <span>{directionsTarget.address}</span>
                  <p>{routeMessage}</p>
                  {routeInfo && (
                    <>
                      <div className="route-guide-summary">
                        <span>{formatDistance(String(routeInfo.distanceMeters))}</span>
                        <span>{formatDuration(routeInfo.durationSeconds)}</span>
                        {routeInfo.fareWon !== undefined && <span>{routeInfo.fareWon.toLocaleString('ko-KR')}원</span>}
                      </div>
                      {routeInfo.steps && routeInfo.steps.length > 0 && (
                        <ol>
                          {routeInfo.steps.map((step, index) => (
                            <li key={`${step.instruction}-${index}`}>
                              <span>{index + 1}</span>
                              <div>
                                <strong>{step.transitLine || step.instruction}</strong>
                                {step.transitLine && <small>{step.instruction}</small>}
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </>
                  )}
                </section>
              ) : (
                <>
                  {displayedToilets.length === 0 && (
                    <p className="map-result-empty">현재 지도 검색 결과에서 일치하는 화장실이 없습니다.</p>
                  )}
                  {displayedToilets.map((toilet, index) => (
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
                </>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

export default Map;
