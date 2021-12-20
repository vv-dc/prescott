export interface AuthorizationAddRoleDto {
  role:
    | 'role_manager'
    | 'group_manager'
    | 'task_manager'
    | 'task_viewer'
    | 'metric_viewer';
}
