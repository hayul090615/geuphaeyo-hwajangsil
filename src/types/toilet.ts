export type Toilet = {
  id: string;
  name: string;
  address: string;
  distance: string;
  openAllDay: boolean;
  accessible: boolean;
  latitude: number;
  longitude: number;
  facilityType?: 'public' | 'building' | 'station' | 'park' | 'other';
  locationDetail?: string;
  hours?: string;
  genderType?: 'separated' | 'unisex' | 'unknown';
  babyFacility?: boolean;
  verifiedAt?: string;
  note?: string;
  status?: 'pending' | 'approved';
};
