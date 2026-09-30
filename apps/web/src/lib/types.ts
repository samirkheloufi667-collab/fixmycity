export type Role = 'CITIZEN' | 'AGENT' | 'ADMIN';
export type ReportStatus = 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type EventType = 'CREATED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'COMMENT';

export interface Me {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  reportCount: number;
  supportCount: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon: string;
}

export interface City {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  zoom: number;
}

/** Point de la carte (champs réduits). */
export interface MapPoint {
  id: string;
  title: string;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  supportCount: number;
  createdAt: string;
  category: Omit<Category, 'id'>;
}

export interface ReportSummary {
  id: string;
  title: string;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  photo: string | null;
  supportCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  category: Category;
  assignee: { id: string; name: string } | null;
  distance?: number;
}

export interface ReportEvent {
  id: string;
  type: EventType;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus | null;
  message: string | null;
  createdAt: string;
  actor: { name: string; role: Role };
}

export interface ReportDetail extends ReportSummary {
  description: string;
  author: { id: string; name: string };
  isMine: boolean;
  supportedByMe: boolean;
  events: ReportEvent[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface PublicStats {
  total: number;
  resolved: number;
  open: number;
  resolvedThisMonth: number;
  citizens: number;
  medianResolutionDays: number | null;
}

export interface AdminStats {
  counts: Record<ReportStatus, number>;
  total: number;
  open: number;
  medianResolutionDays: number | null;
  weeks: { start: string; created: number; resolved: number }[];
  openByCategory: (Pick<Category, 'id' | 'name' | 'color' | 'slug'> & { open: number })[];
  oldestOpen: {
    id: string;
    title: string;
    status: ReportStatus;
    createdAt: string;
    supportCount: number;
    category: { name: string; color: string };
    assignee: { name: string } | null;
  }[];
  workload: { id: string; name: string; role: Role; open: number }[];
}

export interface QueueItem {
  id: string;
  title: string;
  status: ReportStatus;
  address: string | null;
  supportCount: number;
  createdAt: string;
  updatedAt: string;
  category: Omit<Category, 'id'>;
  assignee: { id: string; name: string } | null;
}

export interface Agent {
  id: string;
  name: string;
  role: Role;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  _count: { reports: number };
}
