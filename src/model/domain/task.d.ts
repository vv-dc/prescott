export interface Task {
  id?: number;
  name: string;
  userId: number;
  groupId: number;
  config: string;
  active?: boolean;
}
