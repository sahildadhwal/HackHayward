export interface Question {
  id: string;
  text: string;
  options: string[];
}

export interface Diagnosis {
  issue: string;
  tradeType: string;
  urgency: "low" | "medium" | "high";
  estimateMin: number;
  estimateMax: number;
  riskScore: number;
  riskIfIgnored: string;
  isDIYable: boolean;
}

export interface DIYSupply {
  item: string;
  estimatedCost: number;
  where: string;
}

export interface DIYGuide {
  difficulty: "Easy" | "Medium" | "Hard";
  timeEstimate: string;
  totalCost: number;
  supplies: DIYSupply[];
  steps: string[];
  safetyWarnings: string[];
  whenToCallPro: string;
}

export interface Contractor {
  id: string;
  name: string;
  phone: string;
  rating: number;
  reviewCount: number;
  address: string;
  distanceMi: number;
  estimateMin: number;
  estimateMax: number;
}

export interface ContractorHistory {
  contractorName: string;
  tradeType: string;
  zip: string;
  issue: string;
  originalMin: number;
  originalMax: number;
  negotiatedMin: number;
  negotiatedMax: number;
  saved: number;
  timestamp: string;
}

export interface NegotiatedQuote {
  contractorId: string;
  contractorName: string;
  originalMin: number;
  originalMax: number;
  negotiatedMin: number;
  negotiatedMax: number;
  saved: number;
  availability: string;
  negotiationNote: string;
  callSid?: string;
  script?: string;
}

export interface OwnerInfo {
  name: string;
  phone: string;
  address: string;
  zip: string;
  unit?: string;
}

export interface Booking {
  contractorName: string;
  contractorPhone: string;
  arrivalTime: string;
  estimatedCost: number;
  address: string;
}