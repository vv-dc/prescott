export interface DockerRunDto {
  image: string;
  container: string;
  detached: boolean;
  withDelete: boolean;
  context?: string;
  limitations?: {
    ram?: string;
    rom?: string;
    ttl?: number;
    cpus?: number;
  };
}
