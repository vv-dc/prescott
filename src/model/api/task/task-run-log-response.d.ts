export interface TaskRunLogResponse {
  entries: {
    stream: 'stderr' | 'stdout';
    time: number;
    content: string;
  }[];
  next?: number;
}
