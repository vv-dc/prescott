export interface TaskRunMetricResponse {
  entries: {
    cpu: string;
    ram: string;
    time: number;
    [k: string]: string | number;
  }[];
  next: number;
}
