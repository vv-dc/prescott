export interface Task {
  id: number;
  name: string;
  userId: number;
  groupId: number;
  /**
   * base64 encoded TaskConfig
   */
  config: string;
  active?: boolean;
  envKey?: string;
  envScript?: string;
}
