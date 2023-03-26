import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const permissionNames = [
    'add_to_group',
    'remove_from_group',
    'add_role',
    'remove_role',
    'create_task',
    'delete_task',
    'update_task',
    'view_task',
    'stop_task',
    'start_task',
    'view_metrics',
  ];

  const permissionIds = (
    await knex('permissions')
      .insert(
        permissionNames.map((permissionName) => ({ name: permissionName }))
      )
      .returning<{ id: number }[]>('id')
  ).map(({ id }) => id);

  const permissionMap: { [key: string]: number } = permissionNames
    .map((name, index) => ({
      name: name,
      index: index,
    }))
    .reduce(
      (accumulator, { name, index }) => ({
        ...accumulator,
        [name]: permissionIds[index],
      }),
      {}
    );

  const roleNames = [
    'group_manager',
    'role_manager',
    'task_manager',
    'task_viewer',
    'metric_viewer',
  ];

  const roleIds = (
    await knex('roles')
      .insert(roleNames.map((roleName) => ({ name: roleName })))
      .returning<{ id: number }[]>('id')
  ).map(({ id }) => id);

  const roleMap: { [key: string]: number } = roleNames
    .map((name, index) => ({
      name: name,
      index: index,
    }))
    .reduce(
      (accumulator, { name, index }) => ({
        ...accumulator,
        [name]: roleIds[index],
      }),
      {}
    );

  const rolePermissionsMap: { [key: string]: string[] } = {
    group_manager: ['add_to_group', 'remove_from_group'],
    role_manager: ['add_role', 'remove_role'],
    task_manager: [
      'create_task',
      'delete_task',
      'update_task',
      'view_task',
      'stop_task',
      'start_task',
    ],
    task_viewer: ['view_task'],
    metric_viewer: ['view_metrics'],
  };

  const rolePermissions: { role_id: number; permission_id: number }[] =
    Object.entries(rolePermissionsMap)
      .map(([role, permissions]) =>
        permissions.map((permission) => ({
          role_id: roleMap[role],
          permission_id: permissionMap[permission],
        }))
      )
      .flat();

  await knex('role_permissions').insert(rolePermissions);
}

export async function down(knex: Knex): Promise<void> {
  await knex('permissions').delete();
  await knex('roles').delete();
  await knex('role_permissions').delete();
}
