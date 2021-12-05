export interface DockerBuildDto {
  tag: string;
  osInfo: {
    name: string;
    version?: number | string;
  };
  cmd: string;
  copy: boolean;
  once: boolean;
}
