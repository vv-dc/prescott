export interface DockerRunDto {
  image: string;
  container: string;
  detached: boolean;
  withDelete: boolean;
  context?: string;
  timeout?: number;
  limitations?: {
    ram?: string;
    rom?: string;
    cpus?: number;
  };
}
