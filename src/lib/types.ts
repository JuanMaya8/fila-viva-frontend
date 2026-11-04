/**
 * Mirrors fila-viva-backend contracts exactly
 * (src/modules/queue/interfaces/queue-views.interface.ts and
 * src/modules/prediction/interfaces/prediction-result.interface.ts).
 * Keep them in sync if the backend changes.
 */

export type TurnStatus =
  | 'created'
  | 'called'
  | 'in_service'
  | 'completed'
  | 'absent'
  | 'cancelled';

export type AgentStatus = 'available' | 'busy' | 'on_break' | 'offline';
export type CongestionLevel = 'low' | 'medium' | 'high';
export type PredictionSource = 'model' | 'baseline' | 'fallback';
export type UserRole = 'admin' | 'advisor';

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  institutionId: string;
  agentId: string | null;
}

export interface Institution {
  id: string;
  code: string;
  name: string;
}

export interface PublicServiceType {
  id: string;
  name: string;
  description: string;
  prefix: string;
  avgServiceTimeMinutes: number;
  stepsCount: number;
  waiting: number;
  activeAdvisors: number;
  estimatedWaitMinutes: number | null;
  confidence: number | null;
  congestionLevel: CongestionLevel | null;
}

export interface ServiceStep {
  id: string;
  name: string;
  position: number;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  prefix: string;
  avgServiceTimeMinutes: number;
  active: boolean;
  steps: ServiceStep[];
}

export interface TurnResponse {
  id: string;
  ticketNumber: number;
  ticketCode: string;
  status: TurnStatus;
  serviceTypeId: string;
  serviceTypeName: string;
  preferential: boolean;
  peopleAhead: number;
  estimatedWaitMinutes: number | null;
  lowerMinutes: number | null;
  upperMinutes: number | null;
  confidence: number | null;
  traditionalEstimateMinutes: number | null;
  congestionLevel: CongestionLevel | null;
  source: PredictionSource | null;
  windowNumber: number | null;
  createdAt: string;
  calledAt: string | null;
  estimatedAt: string;
}

export interface QueueSummary {
  serviceTypeId: string;
  name: string;
  prefix: string;
  avgServiceMinutes: number;
  waiting: number;
  activeAdvisors: number;
  estimatedWaitMinutes: number;
  confidence: number;
  congestionLevel: CongestionLevel;
}

export interface DisplayView {
  institutionId: string;
  institutionName: string;
  generatedAt: string;
  serving: Array<{ ticketCode: string; windowNumber: number; status: TurnStatus }>;
  upcoming: Array<{ ticketCode: string; serviceTypeName: string }>;
  queues: Array<
    Pick<QueueSummary, 'serviceTypeId' | 'name' | 'prefix' | 'waiting' | 'estimatedWaitMinutes'>
  >;
}

export interface AdvisorSummary {
  id: string;
  fullName: string;
  windowNumber: number;
  status: AgentStatus;
  active: boolean;
  connected: boolean;
  serviceTypeIds: string[];
  currentTicketCode: string | null;
}

export interface AccuracySummary {
  samples: number;
  aiMaeMinutes: number | null;
  traditionalMaeMinutes: number | null;
  improvementPercent: number | null;
  serviceSamples: number;
  serviceAiMaeMinutes: number | null;
  serviceBaselineMaeMinutes: number | null;
}

export interface DashboardView {
  generatedAt: string;
  source: PredictionSource;
  modelVersion: string;
  congestionLevel: CongestionLevel;
  waitingTotal: number;
  activeAdvisors: number;
  averageEstimatedWaitMinutes: number | null;
  averageActualWaitMinutesToday: number | null;
  queues: QueueSummary[];
  advisors: AdvisorSummary[];
  accuracy: AccuracySummary;
  recent: Array<{
    ticketCode: string;
    serviceTypeName: string;
    predictedWaitMinutes: number | null;
    traditionalWaitMinutes: number | null;
    actualWaitMinutes: number;
    completedAt: string;
  }>;
}

export interface AdvisorCurrentTurn {
  id: string;
  ticketCode: string;
  status: TurnStatus;
  serviceTypeId: string;
  serviceTypeName: string;
  preferential: boolean;
  calledAt: string | null;
  startedAt: string | null;
  steps: ServiceStep[];
  completedStepIds: string[];
  notes: string;
  isComplex: boolean;
  remainingMinutes: number | null;
  lowerMinutes: number | null;
  upperMinutes: number | null;
  expectedTotalMinutes: number | null;
}

export interface AdvisorView {
  id: string;
  fullName: string;
  windowNumber: number;
  status: AgentStatus;
  serviceTypes: Array<{ id: string; name: string; prefix: string }>;
  currentTurn: AdvisorCurrentTurn | null;
  queues: QueueSummary[];
  absentTimeoutMinutes: number;
  generatedAt: string;
}

export interface AgentAdminView {
  id: string;
  fullName: string;
  email: string;
  windowNumber: number;
  status: AgentStatus;
  active: boolean;
  serviceTypeIds: string[];
}

export interface ModelInfo {
  modelVersion: string;
  trainedAt: string | null;
  source: 'model' | 'baseline';
  trainingSamples: number;
  realSamples: number;
  metrics: Record<string, number>;
}
