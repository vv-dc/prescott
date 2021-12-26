export const getTaskSchema = {
  $merge: {
    source: 'domain/task.json',
    with: {
      properties: {
        config: {
          $ref: 'dto/task-config.dto.json#/properties/config',
        },
      },
    },
  },
};
