export interface DockerRunDto {
  image: string;
  container: string;
  context?: string;
  limitations?: {
    ram?: string;
    rom?: string;
    cpus?: number;
    ttl?: number;
  };
  withDelete?: boolean;
}
