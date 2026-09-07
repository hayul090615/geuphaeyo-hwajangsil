import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as KakaoMap,
  MapMarker,
  MarkerClusterer,
  Polyline,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import type { Toilet } from '../types/toilet';
import keyMarkerUrl from '../assets/key-marker.svg';
import userMarkerUrl from '../assets/user-marker.svg';
import { addUserToilet, deleteUserToilet, getUserToilets, updateUserToilet } from '../services/userToiletService';
import { getDirections } from '../services/directionsService';
import type { DirectionsMode, DirectionsRoute } from '../services/directionsService';
import { getGoingCounts, releaseGoing, touchGoing } from '../services/directionsPresenceService';
import type { User } from '../types/auth';
import ToiletReviewModal from './ToiletReviewModal';
import AuthSideGame from './AuthSideGame';

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
const SEARCH_PAGE_COUNT = 1;
const WIDE_SEARCH_GRID_SIZE = 2;
const NEARBY_SEARCH_GRID_SIZE = 1;
const SEARCH_CONCURRENCY = 8;
const SEARCH_REQUEST_TIMEOUT_MS = 2_200;
const SEARCH_DEBOUNCE_MS = 500;
const SEOUL_MAP_LEVEL = 8;
const NEARBY_MAP_LEVEL = 5;
const MAX_AUTO_LOCATION_ACCURACY_METERS = 150;
const MAX_SEARCH_CACHE_ENTRIES = 24;
const DIRECTIONS_MODE_OPTIONS: Array<{ mode: DirectionsMode; icon: string; label: string }> = [
  { mode: 'walk', icon: '🚶', label: '도보' },
  { mode: 'bicycle', icon: '🚲', label: '자전거' },
  { mode: 'car', icon: '🚗', label: '자동차' },
];

const MAP_REGIONS = [
  { id: 'seoul', label: '서울', color: '#ff5d4c', path: [{ lat: 37.55532, lng: 126.76443 }, { lat: 37.53716, lng: 126.79822 }, { lat: 37.51965, lng: 126.82542 }, { lat: 37.49832, lng: 126.81431 }, { lat: 37.47817, lng: 126.81725 }, { lat: 37.46531, lng: 126.88385 }, { lat: 37.4387, lng: 126.89898 }, { lat: 37.45009, lng: 126.92876 }, { lat: 37.43926, lng: 126.95653 }, { lat: 37.45711, lng: 126.98627 }, { lat: 37.44054, lng: 127.03526 }, { lat: 37.46718, lng: 127.12454 }, { lat: 37.52102, lng: 127.14534 }, { lat: 37.57371, lng: 127.17658 }, { lat: 37.63716, lng: 127.11216 }, { lat: 37.69591, lng: 127.078 }, { lat: 37.67522, lng: 126.99372 }, { lat: 37.6407, lng: 126.98594 }, { lat: 37.65153, lng: 126.93646 }, { lat: 37.63216, lng: 126.90644 }, { lat: 37.60574, lng: 126.90174 }, { lat: 37.58922, lng: 126.89327 }, { lat: 37.57728, lng: 126.86685 }, { lat: 37.60192, lng: 126.79976 }, { lat: 37.55532, lng: 126.76443 }] },
  { id: 'incheon', label: '인천', color: '#3979d5', path: [{ lat: 37.688, lng: 126.526 }, { lat: 37.663, lng: 126.536 }, { lat: 37.636, lng: 126.538 }, { lat: 37.605, lng: 126.626 }, { lat: 37.592, lng: 126.725 }, { lat: 37.58, lng: 126.793 }, { lat: 37.55, lng: 126.764 }, { lat: 37.515, lng: 126.758 }, { lat: 37.485, lng: 126.749 }, { lat: 37.455, lng: 126.779 }, { lat: 37.433, lng: 126.77 }, { lat: 37.423, lng: 126.756 }, { lat: 37.407, lng: 126.749 }, { lat: 37.394, lng: 126.68 }, { lat: 37.407, lng: 126.62 }, { lat: 37.445, lng: 126.56 }, { lat: 37.52, lng: 126.52 }, { lat: 37.61, lng: 126.5 }, { lat: 37.688, lng: 126.526 }] },
  { id: 'gyeonggi', label: '경기', color: '#36a269', path: [{ lat: 37.98, lng: 126.84 }, { lat: 38.01, lng: 127.25 }, { lat: 37.96, lng: 127.63 }, { lat: 37.84, lng: 127.92 }, { lat: 37.57, lng: 127.94 }, { lat: 37.19, lng: 127.82 }, { lat: 36.93, lng: 127.55 }, { lat: 36.96, lng: 127.08 }, { lat: 37.16, lng: 126.72 }, { lat: 37.38, lng: 126.5 }, { lat: 37.68, lng: 126.52 }, { lat: 37.88, lng: 126.66 }, { lat: 37.98, lng: 126.84 }] },
];

type MapRegionId = 'seoul' | 'incheon' | 'gyeonggi' | 'other';

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
  babyFacility?: boolean;
  requiresAccessKey?: boolean;
  requiresPassword?: boolean;
  accessNote?: string;
  dataSource: 'kakao' | 'osm' | 'seoul' | 'static';
  isUserAdded?: boolean;
};
type RouteInfo = DirectionsRoute;
type MapProps = { toilets: Toilet[]; query?: string; user: User | null; onLoginRequired: () => void };

const ACCESS_KEY_MARKER_IMAGE = {
  src: keyMarkerUrl,
  size: { width: 40, height: 48 },
  options: {
    alt: 'Access key required toilet',
    offset: { x: 20, y: 48 },
  },
};
const USER_MARKER_IMAGE = { src: userMarkerUrl, size: { width: 40, height: 48 }, options: { alt: '내가 추가한 화장실', offset: { x: 20, y: 48 } } };

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
    dataSource: 'kakao',
  };
}

function getDataConfidenceLabel(toilet: MapToilet) {
  if (toilet.dataSource === 'kakao') return '카카오 장소 등록';
  if (toilet.dataSource === 'seoul') return '서울시 공식 데이터';
  if (toilet.dataSource === 'osm') return 'OSM 등록 · 현장 미확인';
  return '정적 데이터 · 현장 미확인';
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

function getDirectionsModeLabel(mode: DirectionsMode) {
  return DIRECTIONS_MODE_OPTIONS.find((option) => option.mode === mode)?.label || '도보';
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

function Map({ toilets, query, user, onLoginRequired }: MapProps) {
  if (!KAKAO_MAP_KEY) {
    return (
      <div className="map-feedback" role="alert">
        <strong>카카오 지도 키가 필요합니다.</strong>
        <span>.env 파일에 VITE_KAKAO_MAP_KEY를 설정하고 개발 서버를 다시 시작해 주세요.</span>
      </div>
    );
  }

  return <LoadedMap appKey={KAKAO_MAP_KEY} toilets={toilets} query={query} user={user} onLoginRequired={onLoginRequired} />;
}

function getMapRegion(toilet: MapToilet): MapRegionId {
  if (toilet.address.includes('인천') || (toilet.lng < 126.79 && toilet.lat < 37.78)) return 'incheon';
  if (toilet.address.includes('경기') || (toilet.lat < 37.42 || toilet.lat > 37.7 || toilet.lng > 127.185)) return 'gyeonggi';
  if (toilet.address.includes('서울') || (toilet.lat >= 37.42 && toilet.lat <= 37.7 && toilet.lng >= 126.764 && toilet.lng <= 127.185)) return 'seoul';
  return 'other';
}

function LoadedMap({ appKey, toilets, query = '', user, onLoginRequired }: MapProps & { appKey: string }) {
  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ['services', 'clusterer'],
  });
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [mapLevel, setMapLevel] = useState(SEOUL_MAP_LEVEL);
  const [viewportBounds, setViewportBounds] = useState<{
    south: number;
    west: number;
    north: number;
    east: number;
  } | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [nearbyToilets, setNearbyToilets] = useState<MapToilet[]>([]);
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
  const [selectedToiletId, setSelectedToiletId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<MapToilet | null>(null);
  const [directionsTarget, setDirectionsTarget] = useState<MapToilet | null>(null);
  const [directionsMode, setDirectionsMode] = useState<DirectionsMode>('walk');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeMessage, setRouteMessage] = useState('');
  const [isSkyview, setIsSkyview] = useState(false);
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);
  const [isResultPanelOpen, setIsResultPanelOpen] = useState(true);
  const [showRestrictedOnly, setShowRestrictedOnly] = useState(false);
  const [userToilets, setUserToilets] = useState<Toilet[]>([]);
  const [isAddingToilet, setIsAddingToilet] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [goingCounts, setGoingCounts] = useState<Record<string, number>>({});
  const [activeGoingToiletId, setActiveGoingToiletId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('서울 중심의 화장실을 찾는 중입니다.');
  const searchSequence = useRef(0);
  const searchTimer = useRef<number | null>(null);
  const searchCache = useRef(new globalThis.Map<string, MapToilet[]>());
  const directionsTargetRef = useRef<MapToilet | null>(null);
  const activeGoingToiletRef = useRef<string | null>(null);
  const directionsSequence = useRef(0);
  const viewportKeyRef = useRef('');
  const regionQuery = query.replace(/화장실/g, ' ').trim();

  useEffect(() => setUserToilets(getUserToilets(user?.id ?? null)), [user?.id]);

  const fallbackToilets = useMemo<MapToilet[]>(() => [...toilets, ...userToilets].map((toilet) => ({
    id: `mock-${toilet.id}`,
    name: toilet.name,
    address: toilet.address,
    distance: currentPosition
      ? formatDistance(String(getDistanceMeters(currentPosition, { lat: toilet.latitude, lng: toilet.longitude })))
      : toilet.distance,
    lat: toilet.latitude,
    lng: toilet.longitude,
    category: '공공 화장실',
    openAllDay: toilet.openAllDay,
    accessible: toilet.accessible,
    babyFacility: toilet.babyFacility,
    requiresAccessKey: toilet.requiresAccessKey,
    requiresPassword: toilet.requiresPassword,
    accessNote: toilet.accessNote,
    dataSource: toilet.id.startsWith('seoul-eunpyeong-')
      ? 'seoul'
      : toilet.id.startsWith('osm-') ? 'osm' : 'static',
    isUserAdded: toilet.isUserAdded,
  })), [currentPosition, toilets, userToilets]);

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
        if (!Number.isFinite(coords.accuracy) || coords.accuracy > MAX_AUTO_LOCATION_ACCURACY_METERS) {
          const accuracyText = Number.isFinite(coords.accuracy)
            ? `GPS 오차 범위가 약 ${Math.round(coords.accuracy)}m로 큽니다.`
            : '현재 위치 정확도를 확인할 수 없습니다.';
          const message = `${accuracyText} 지도에서 실제 위치를 직접 선택해 주세요.`;
          setStatusMessage(message);
          onLocationError?.(message);
          return;
        }

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
    if (!map || !window.kakao?.maps?.services || directionsTargetRef.current || regionQuery) return;
    if (map.getLevel() > NEARBY_MAP_LEVEL) {
      setNearbyToilets([]);
      setHasCompletedSearch(false);
      return;
    }

    const requestId = ++searchSequence.current;
    const places = new kakao.maps.services.Places();
    const bounds = map.getBounds();
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    const searchCacheKey = [
      map.getLevel(),
      southWest.getLat().toFixed(3),
      southWest.getLng().toFixed(3),
      northEast.getLat().toFixed(3),
      northEast.getLng().toFixed(3),
    ].join(':');
    const cachedToilets = searchCache.current.get(searchCacheKey);
    if (cachedToilets) {
      setNearbyToilets(cachedToilets);
      setHasCompletedSearch(true);
      return;
    }
    const isWideSearch = map.getLevel() >= 7;
    const gridSize = isWideSearch ? WIDE_SEARCH_GRID_SIZE : NEARBY_SEARCH_GRID_SIZE;
    const searchKeywords = isWideSearch ? TOILET_SEARCH_KEYWORDS.slice(0, 4) : TOILET_SEARCH_KEYWORDS;
    const searchBounds = splitBounds(bounds, gridSize);
    setStatusMessage('현재 지도 영역의 화장실을 최대한 많이 찾는 중입니다.');

    const searchPage = (keyword: string, cellBounds: kakao.maps.LatLngBounds, page: number) => new Promise<kakao.maps.services.PlacesSearchResult>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => resolve([]), SEARCH_REQUEST_TIMEOUT_MS);
      places.keywordSearch(
        keyword,
        (result, status) => {
          window.clearTimeout(timeoutId);
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
    searchCache.current.set(searchCacheKey, foundToilets);
    if (searchCache.current.size > MAX_SEARCH_CACHE_ENTRIES) {
      const oldestKey = searchCache.current.keys().next().value;
      if (oldestKey) searchCache.current.delete(oldestKey);
    }
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
  }, [map, regionQuery]);

  const scheduleMapSearch = useCallback(() => {
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      void searchMapBounds();
    }, SEARCH_DEBOUNCE_MS);
  }, [searchMapBounds]);

  const refreshMapViewport = useCallback(() => {
    if (map) {
      const bounds = map.getBounds();
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();
      const nextBounds = {
        south: southWest.getLat(),
        west: southWest.getLng(),
        north: northEast.getLat(),
        east: northEast.getLng(),
      };
      const nextKey = [
        map.getLevel(),
        nextBounds.south.toFixed(4),
        nextBounds.west.toFixed(4),
        nextBounds.north.toFixed(4),
        nextBounds.east.toFixed(4),
      ].join(':');

      if (viewportKeyRef.current !== nextKey) {
        viewportKeyRef.current = nextKey;
        setViewportBounds(nextBounds);
      }
    }
    scheduleMapSearch();
  }, [map, scheduleMapSearch]);

  useEffect(() => {
    if (map) scheduleMapSearch();
    return () => {
      if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    };
  }, [map, scheduleMapSearch]);
  useEffect(() => {
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
  }, [map, regionQuery]);

  const availableToilets = useMemo(() => {
    const isInCurrentBounds = (toilet: MapToilet) => !viewportBounds || (
      toilet.lat >= viewportBounds.south &&
      toilet.lat <= viewportBounds.north &&
      toilet.lng >= viewportBounds.west &&
      toilet.lng <= viewportBounds.east
    );
    const fallbackToiletsInBounds = fallbackToilets.filter(isInCurrentBounds);
    if (!hasCompletedSearch) return fallbackToiletsInBounds;

    const nearbyToiletsInBounds = nearbyToilets.filter(isInCurrentBounds);
    const importedToilets = fallbackToiletsInBounds.filter((fallback) => !nearbyToiletsInBounds.some((nearby) =>
      nearby.name === fallback.name || getDistanceMeters(nearby, fallback) < 35
    ));
    return [...nearbyToiletsInBounds, ...importedToilets];
  }, [fallbackToilets, hasCompletedSearch, nearbyToilets, viewportBounds]);
  const restrictedToiletCount = availableToilets.filter((toilet) => toilet.requiresAccessKey).length;
  const visibleToilets = useMemo(() => {
    let filtered = showRestrictedOnly ? availableToilets.filter((toilet) => toilet.requiresAccessKey) : availableToilets;
    return filtered;
  }, [availableToilets, showRestrictedOnly]);
  const displayedToilets = directionsTarget ? [directionsTarget] : visibleToilets;
  const displayedToiletIds = useMemo(
    () => Array.from(new Set(displayedToilets.map((toilet) => toilet.id))),
    [displayedToilets],
  );

  useEffect(() => {
    let cancelled = false;
    const refreshGoingCounts = async () => {
      try {
        const counts = await getGoingCounts(displayedToiletIds);
        if (cancelled) return;
        setGoingCounts((current) => {
          const next = { ...current };
          displayedToiletIds.forEach((toiletId) => {
            next[toiletId] = counts[toiletId] ?? 0;
          });
          return next;
        });
      } catch {
        // 길찾기 숫자는 부가 정보이므로 지도와 경로 기능은 계속 사용할 수 있습니다.
      }
    };

    void refreshGoingCounts();
    const intervalId = window.setInterval(() => void refreshGoingCounts(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [displayedToiletIds]);

  useEffect(() => {
    if (!activeGoingToiletId) return undefined;

    const refreshActivePresence = async () => {
      try {
        const result = await touchGoing(activeGoingToiletId);
        setGoingCounts((current) => ({ ...current, [activeGoingToiletId]: result.count }));
      } catch {
        // 다음 heartbeat에서 다시 시도합니다.
      }
    };

    void refreshActivePresence();
    const intervalId = window.setInterval(() => void refreshActivePresence(), 15_000);
    return () => window.clearInterval(intervalId);
  }, [activeGoingToiletId]);

  useEffect(() => () => {
    const toiletId = activeGoingToiletRef.current;
    if (toiletId) void releaseGoing(toiletId).catch(() => undefined);
  }, []);

  const getPeopleGoing = (toilet: MapToilet) => goingCounts[toilet.id] ?? 0;

  const activateGoing = (toiletId: string) => {
    const previousToiletId = activeGoingToiletRef.current;
    if (previousToiletId === toiletId) return;

    if (previousToiletId) void releaseGoing(previousToiletId).catch(() => undefined);
    activeGoingToiletRef.current = toiletId;
    setActiveGoingToiletId(toiletId);
    void touchGoing(toiletId)
      .then((result) => setGoingCounts((current) => ({ ...current, [toiletId]: result.count })))
      .catch(() => undefined);
  };

  const deactivateGoing = () => {
    const toiletId = activeGoingToiletRef.current;
    if (!toiletId) return;

    activeGoingToiletRef.current = null;
    setActiveGoingToiletId(null);
    void releaseGoing(toiletId)
      .then((result) => setGoingCounts((current) => ({ ...current, [toiletId]: result.count })))
      .catch(() => undefined);
  };

  if (loading) return <div className="map-feedback">카카오 지도를 불러오는 중입니다.</div>;

  if (error) {
    return (
      <div className="map-feedback" role="alert">
        <strong>카카오 지도를 불러오지 못했습니다.</strong>
        <span>카카오 Developers의 JavaScript SDK 도메인에 {window.location.origin}이 등록되어 있는지 확인해 주세요.</span>
      </div>
    );
  }

  const center = currentPosition ?? DEFAULT_POSITION;
  const toiletsByRegion = (() => {
    const groups: Record<MapRegionId, MapToilet[]> = { seoul: [], incheon: [], gyeonggi: [], other: [] };
    displayedToilets.forEach((toilet) => groups[getMapRegion(toilet)].push(toilet));
    return groups;
  })();

  const selectToilet = (toilet: MapToilet) => {
    setSelectedToiletId((current) => current === toilet.id ? null : toilet.id);
  };

  const renderToiletMarker = (toilet: MapToilet) => (
    <MapMarker
      key={toilet.id}
      position={{ lat: toilet.lat, lng: toilet.lng }}
      image={toilet.requiresAccessKey ? ACCESS_KEY_MARKER_IMAGE : undefined}
      title={`${toilet.requiresPassword ? '비밀번호 필요 · ' : toilet.requiresAccessKey ? '출입 확인 필요 · ' : ''}${toilet.name}`}
      onClick={() => directionsTarget ? setSelectedToiletId(toilet.id) : selectToilet(toilet)}
    >
      {selectedToiletId === toilet.id && (
        <div className="map-place-info">
          <strong>{toilet.name}</strong><span>{toilet.address}</span><span className="map-going-now">👥 {getPeopleGoing(toilet)}명 가는 중 · 잠시 대기 가능</span>
          <p className="map-place-description">{toilet.category || '화장실'}로 등록된 시설입니다. 운영시간과 현장 편의시설은 방문 전 확인해 주세요.</p>
          <div className="map-place-meta">
            {toilet.category && <span>{toilet.category}</span>}{toilet.distance && <em>{toilet.distance}</em>}
            {toilet.openAllDay !== undefined && <span>{toilet.openAllDay ? '24시간 운영' : '운영시간 확인 필요'}</span>}
            {toilet.requiresAccessKey && <span title={toilet.accessNote}>🔑 {toilet.requiresPassword ? '비밀번호 필요' : '출입 확인 필요'}</span>}
            <span className="map-data-confidence">{getDataConfidenceLabel(toilet)}</span>{toilet.accessible && <span>휠체어 접근 가능</span>}
          </div>
          {toilet.phone && <a href={`tel:${toilet.phone}`}>{toilet.phone}</a>}
          {!directionsTarget && <div className="map-place-actions"><button type="button" className="map-review-button" onClick={(event) => { event.stopPropagation(); setReviewTarget(toilet); }}>별점·청결도 리뷰</button><button type="button" className="map-direction-button" onClick={(event) => { event.stopPropagation(); startDirections(toilet); }}>길찾기 시작</button></div>}
        </div>
      )}
    </MapMarker>
  );

  const focusToilet = (toilet: MapToilet) => {
    selectToilet(toilet);
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
    const modeLabel = getDirectionsModeLabel(mode);
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
    activateGoing(toilet.id);
    setIsResultPanelOpen(true);
    searchSequence.current += 1;
    directionsTargetRef.current = toilet;
    setDirectionsTarget(toilet);
    setDirectionsMode('walk');
    setIsSelectingOrigin(false);
    setSelectedToiletId(toilet.id);
    setRouteMessage('현재 위치를 확인하는 중입니다.');
    map?.panTo(new kakao.maps.LatLng(toilet.lat, toilet.lng));

    requestCurrentLocation(
      (origin) => {
        if (directionsTargetRef.current?.id !== toilet.id) return;
        void loadDirections(origin, toilet, 'walk');
      },
      (message) => {
        if (directionsTargetRef.current?.id === toilet.id) {
          setIsSelectingOrigin(true);
          setRouteMessage(message);
        }
      },
    );
  };

  const stopDirections = () => {
    deactivateGoing();
    directionsSequence.current += 1;
    directionsTargetRef.current = null;
    setDirectionsTarget(null);
    setIsSelectingOrigin(false);
    setRouteInfo(null);
    setDirectionsMode('walk');
    setRouteMessage('');
    setSelectedToiletId(null);
    setMapLevel(NEARBY_MAP_LEVEL);
    setStatusMessage('현재 위치 주변의 화장실을 다시 찾는 중입니다.');
    map?.setLevel(NEARBY_MAP_LEVEL);
    map?.panTo(new kakao.maps.LatLng(center.lat, center.lng));
    scheduleMapSearch();
  };

  const changeDirectionsMode = (mode: DirectionsMode) => {
    setDirectionsMode(mode);
    if (!directionsTarget || !currentPosition || isSelectingOrigin || mode === directionsMode) return;
    void loadDirections(currentPosition, directionsTarget, mode);
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
    if (isAddingToilet) {
      if (!user) { onLoginRequired(); setIsAddingToilet(false); return; }
      const latitude = mouseEvent.latLng.getLat();
      const longitude = mouseEvent.latLng.getLng();
      const name = window.prompt('화장실 이름을 입력하세요.', '내가 추가한 화장실');
      if (!name?.trim()) { setIsAddingToilet(false); return; }
      const address = window.prompt('주소나 위치 설명을 입력하세요.', '지도에서 선택한 위치');
      const added = addUserToilet(user.id, { name: name.trim(), address: address?.trim() || '지도에서 선택한 위치', distance: '', openAllDay: false, accessible: false, latitude, longitude });
      setUserToilets(getUserToilets(user.id));
      setSelectedToiletId(`mock-${added.id}`);
      setIsAddingToilet(false);
      setStatusMessage('초록색 마커로 화장실을 추가했습니다.');
      return;
    }
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
                  {DIRECTIONS_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      className={directionsMode === option.mode ? 'is-active' : ''}
                      aria-pressed={directionsMode === option.mode}
                      disabled={isSelectingOrigin}
                      onClick={() => changeDirectionsMode(option.mode)}
                    >
                      <span aria-hidden="true">{option.icon}</span>
                      {option.label}
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
        <div className={`map-status-actions${directionsTarget ? ' is-directions' : ''}`}>
          {!directionsTarget && <button type="button" onClick={() => setIsGameOpen(true)}>똥 쌀 때 심심하지 않으세요?</button>}
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
              <button type="button" onClick={toggleSkyview}>{isSkyview ? '일반지도' : '위성뷰'}</button>
            </>
          )}
          <button
            type="button"
            aria-controls="map-result-panel"
            aria-expanded={isResultPanelOpen}
            onClick={() => setIsResultPanelOpen((current) => !current)}
          >
            {isResultPanelOpen ? '목록 닫기' : '목록 열기'}
          </button>
        </div>
      </div>
      <section className={`kakao-map-wrap${isSelectingOrigin ? ' is-selecting-origin' : ''}${isAddingToilet ? ' is-adding-toilet' : ''}`} aria-label="현재 지도 영역의 화장실 지도">
        <div className="map-content">
          <KakaoMap
            center={center}
            className="kakao-map"
            level={mapLevel}
            onCreate={setMap}
            onIdle={refreshMapViewport}
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
                  image={toilet.isUserAdded ? USER_MARKER_IMAGE : toilet.requiresAccessKey ? ACCESS_KEY_MARKER_IMAGE : undefined}
                  title={`${toilet.requiresPassword ? '비밀번호 필요 · ' : toilet.requiresAccessKey ? '출입 확인 필요 · ' : ''}${toilet.name}`}
                  onClick={() => setSelectedToiletId((current) => directionsTarget ? toilet.id : current === toilet.id ? null : toilet.id)}
                >
                  {selectedToiletId === toilet.id && (
                    <div className="map-place-info">
                      <strong>{toilet.name}</strong>
                      <span>{toilet.address}</span><span className="map-going-now">👥 {getPeopleGoing(toilet)}명 가는 중 · 잠시 대기 가능</span>
                      <p className="map-place-description">
                        {toilet.category || '화장실'}로 등록된 시설입니다. 운영시간과 현장 편의시설은 방문 전 전화 또는 현장 안내로 확인해 주세요.
                      </p>
                      <div className="map-place-meta">
                        {toilet.category && <span>{toilet.category}</span>}
                        {toilet.distance && <em>{toilet.distance}</em>}
                        {toilet.openAllDay !== undefined && <span>{toilet.openAllDay ? '24시간 운영' : '운영시간 확인 필요'}</span>}
                        {toilet.requiresAccessKey && (
                          <span title={toilet.accessNote}>
                            &#128273; {toilet.requiresPassword ? '비밀번호 필요' : '출입 확인 필요'}
                          </span>
                        )}
                        <span className="map-data-confidence">{getDataConfidenceLabel(toilet)}</span>
                        {toilet.accessible && <span>휠체어 접근 가능</span>}
                      </div>
                      {toilet.phone && <a href={`tel:${toilet.phone}`}>{toilet.phone}</a>}
                      {!directionsTarget && (
                        <div className="map-place-actions">
                          {toilet.isUserAdded && <><button type="button" className="map-edit-button" onClick={(event) => { event.stopPropagation(); if (!user) return; const name = window.prompt('화장실 이름을 수정하세요.', toilet.name); if (!name?.trim()) return; const address = window.prompt('주소나 위치 설명을 수정하세요.', toilet.address); updateUserToilet(user.id, { id: toilet.id, name: name.trim(), address: address?.trim() || toilet.address, distance: toilet.distance || '', openAllDay: toilet.openAllDay ?? false, accessible: toilet.accessible ?? false, latitude: toilet.lat, longitude: toilet.lng, isUserAdded: true }); setUserToilets(getUserToilets(user.id)); }}>수정</button><button type="button" className="map-delete-button" onClick={(event) => { event.stopPropagation(); if (user && window.confirm('이 화장실을 삭제할까요?')) { deleteUserToilet(user.id, toilet.id.replace(/^mock-/, '')); setUserToilets(getUserToilets(user.id)); setSelectedToiletId(null); } }}>삭제</button></>}
                          {!toilet.isUserAdded && <button type="button" className="map-review-button" onClick={(event) => { event.stopPropagation(); setReviewTarget(toilet); }}>별점·청결도 리뷰</button>}
                          <button type="button" className="map-direction-button" onClick={(event) => { event.stopPropagation(); startDirections(toilet); }}>길찾기 시작</button>
                        </div>
                      )}
                    </div>
                  )}
                </MapMarker>
              ))}
            </MarkerClusterer>
          </KakaoMap>

          {!directionsTarget && (
            <div className="map-access-tools">
              <button
                type="button"
                className={showRestrictedOnly ? 'map-access-filter is-active' : 'map-access-filter'}
                aria-pressed={showRestrictedOnly}
                onClick={() => setShowRestrictedOnly((current) => !current)}
              >
                <span aria-hidden="true">&#128273;</span>
                출입 제한만
                <strong>{restrictedToiletCount}</strong>
              </button>
              <div className="map-marker-legend" aria-label="지도 마커 안내">
                <span>
                  <i className="map-legend-default" aria-hidden="true" />
                  일반 화장실
                </span>
                <span><img src={keyMarkerUrl} alt="" />비밀번호·출입 확인</span>
              </div>
            </div>
          )}

          {!directionsTarget && <><button type="button" className="map-current-location-button" aria-label="현재 위치로 이동" onClick={() => requestCurrentLocation()}>⌖</button><button type="button" className="map-add-toilet-button" aria-label="화장실 추가" onClick={() => { if (!user) { onLoginRequired(); return; } setIsAddingToilet((active) => !active); setStatusMessage(isAddingToilet ? '화장실 추가를 취소했습니다.' : '지도를 클릭해 화장실 위치를 선택하세요.'); }}>+</button></>}
          {isResultPanelOpen && (
            <aside id="map-result-panel" className="map-result-panel" aria-label="화장실 위치 목록">
            <div className="map-result-heading">
              <div>
                <strong>{directionsTarget ? '길찾기 목적지' : '화장실 위치'}</strong>
                {!directionsTarget && <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">일부 위치 © OpenStreetMap</a>}
              </div>
              <span>{visibleToilets.length}곳</span>
            </div>
            <div className="map-result-list">
              {directionsTarget ? (
                <section className="route-guide" aria-label="경로 상세 안내">
                  <strong>{directionsTarget.name}</strong>
                  <span>{directionsTarget.address}</span>
                  <small className="map-going-now">👥 {getPeopleGoing(directionsTarget)}명 가는 중 · 잠시 대기 가능</small>
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
                      <span className="map-result-number" title={toilet.accessNote}>
                        {toilet.requiresAccessKey ? <span aria-label="열쇠">&#128273;</span> : index + 1}
                      </span>
                      <span className="map-result-copy">
                        <strong>{toilet.name}</strong>
                        <span>{toilet.address}</span>
                        <small className="map-going-now">👥 {getPeopleGoing(toilet)}명 가는 중 · 잠시 대기 가능</small>
                        <small>{getDataConfidenceLabel(toilet)}</small>
                      </span>
                      {toilet.distance && <em>{toilet.distance}</em>}
                    </button>
                  ))}
                </>
              )}
            </div>
            </aside>
          )}
        </div>
      </section>
      {reviewTarget && <ToiletReviewModal toilet={reviewTarget} user={user} onClose={() => setReviewTarget(null)} onLogin={onLoginRequired} />}
      {isGameOpen && (
        <div className="map-game-modal" role="dialog" aria-modal="true" aria-label="똥 피하기 게임">
          <button type="button" className="map-game-close" onClick={() => setIsGameOpen(false)} aria-label="게임 닫기">×</button>
          <AuthSideGame onExit={() => setIsGameOpen(false)} />
        </div>
      )}
    </>
  );
}

export default Map;
