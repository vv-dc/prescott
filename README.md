# Prescott

## What is Prescott
Prescott is a lightweight REST-based application for automation purposes. Built with Node.js, it provides
a handy minimalistic interface for tasks creation, scheduling, and monitoring. Simple and robust – Prescott at your service.

## Goals
* Tasks scheduling
* Creating an isolated environment for each task
* Collecting tasks execution metrics and logs
* Access management with groups, roles, and permissions

## Features
* Tasks. It's the core of Prescott. There are two main kinds of that:
  + Track task for a repository. Prescott will be monitoring the repository and running relevant scenarios for every type of event happening.
  + General task. It can be everything a machine can do. Just emphasize what you want and Prescott will take care of it. It's that simple.
* Borders. Prescott allows set limitations both for the particular task and for the server in general.
* Configuration. Use JSON-like configuration language to communicate with Prescott. Be sure, it will understand what do you mean.
* Logs & History. Every piece of output of every run will be available as long as you want.
* Metrics. Prescott can measure and build statistics for resources usage of every task.
* Extending. Prescott is fully open, therefore it's easy to create your solutions. GUI, for example.
* Authentication. Only authenticated users can interact with the application.
* Authorization. Prescott provides a system based on groups, roles, and permission to manage access to everything in the system.

## Config interface
```ts
interface TaskConfig {
  name: string;
  osInfo: {
    name: string;
    version?: number | string;
  };
  once?: boolean;
  config: {
    local?: {
      cronString: string;
    };
    repository?: {
      url: string;
      branch: string;
    };
    appConfig: {
      steps: {
        name: string;
        script: string;
        ignoreFailure?: boolean;
      }[];
      limitations?: {
        ram?: string;
        rom?: string;
        ttl?: number;
        cpus?: number;
      };
    };
  };
}
```

## Technologies
* Backend: Fastify, TypeScript
* Auth: JWT
* Database: Knex & PostgreSQL
* CI/CD: Docker, GitHub Actions
* Validation: JSON-schema
* Other: node-cron, pidusage, docker-compose, swagger