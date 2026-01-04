export interface Civilization {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  color: string;
}

export interface Polity {
  id: string;
  name: string;
  civilizationId: string;
  startYear: number;
  endYear: number;
  color: string;
  importance: 'high' | 'medium' | 'low';
}

export interface Person {
  id: string;
  name: string;
  birthYear: number;
  deathYear: number;
  polityId: string;
  importance: 'high' | 'medium' | 'low';
  title?: string;
}

export interface Event {
  id: string;
  name: string;
  type: 'point' | 'duration';
  year?: number;
  startYear?: number;
  endYear?: number;
  importance: 'high' | 'medium' | 'low';
  relatedPolities?: string[];
  relatedPersons?: string[];
}

export interface TimelineData {
  civilizations: Civilization[];
  polities: Polity[];
  persons: Person[];
  events: Event[];
  metadata: {
    viewportSpan: number;
    densityLevel: string;
  };
}

export interface ViewportState {
  zoomScale: number;
  centerYear: number;
  startYear: number;
  endYear: number;
  viewportSpan: number;
  offsetX: number;
  isDragging: boolean;
}

export interface TimelineItem {
  id: string;
  start: number;
  end: number;
}

export interface TrackAssignment {
  [itemId: string]: number;
}

