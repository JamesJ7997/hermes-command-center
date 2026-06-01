import axios from 'axios';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || '';

export interface GatewayStatus {
  connected: boolean;
  version: string;
  activeProfile: string;
}

export interface DashboardMetrics {
  activeSessions: number;
  totalTokens: number;
  apiCalls: number;
  activeModel: string;
}

export const gateway = {
  async getStatus(): Promise<GatewayStatus> {
    try {
      const { data } = await axios.get(`/api/status`);
      return data;
    } catch (error) {
      console.error('Gateway heartbeat failed:', error);
      return { connected: false, version: 'unknown', activeProfile: 'none' };
    }
  },

  async getMetrics(): Promise<DashboardMetrics> {
    try {
      const { data } = await axios.get(`/api/metrics`);
      return data;
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      return { activeSessions: 0, totalTokens: 0, apiCalls: 0, activeModel: 'unknown' };
    }
  },

  async switchProfile(profileName: string) {
    return axios.post(`${GATEWAY_URL}/profile/switch`, { profile: profileName });
  }
};
