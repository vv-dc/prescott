# Multiple databases
Prescott allows to choose the storage option (PostgreSQL, SQLite3, etc.)\
It's regulated by following ENV variables:
```dotenv
DB_CONN_STRING="" # connection string
DB_CLIENT="" # database type
```
SQLite3 is being used by default because it does not require any extra actions from the user's side.\
Upon changing the storage option install the corresponding database driver. For example:
```shell
yarn add pg # postgres
```
This functionality is implemented via Knex. Refer to its documentation for more details.
