export interface DockerBuildDto {
  tag: string;
  osInfo: OsInfoDto;
  cmd: string;
  copy: boolean;
  once: boolean;
}
export interface OsInfoDto {
  name: string;
  version?: number | string;
}
