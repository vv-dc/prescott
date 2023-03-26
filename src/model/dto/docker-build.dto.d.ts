export interface DockerBuildDto {
  tag: string;
  osInfo: OsInfo;
  cmd: string;
  copy: boolean;
  once: boolean;
}
export interface OsInfo {
  name: string;
  version?: number | string;
}
