/**
 * TypeScript declarations for endpoints configuration
 */

export interface ApiServers {
  PRIMARY: string;
  STATUS_PRIMARY: string;
  STATUS_SECONDARY: string;
}

export interface BaseUrls {
  PRIMARY: string;
  STATUS_PRIMARY: string;
  STATUS_SECONDARY: string;
}

export interface Endpoints {
  DAILY_AVERAGE_STAY: string;
  STAY_TIMES_DISTRIBUTION: string;
  STAY_TIMES_TREND: string;
  LAST_UPDATE_STATUS: string;
  LAST_UPDATE_STATUS_SECONDARY: string;
}

export declare const API_SERVERS: ApiServers;
export declare const API_PORT: string;
export declare const BASE_URLS: BaseUrls;
export declare const ENDPOINTS: Endpoints;