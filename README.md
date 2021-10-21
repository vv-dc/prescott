# Prescott

## What is Prescott
Prescott is a lightweight REST-based application for automation purposes. Built with Node.js, it provides
a handy minimalistic interface for tasks creation, scheduling, and monitoring. Simple and robust – Prescott at your service.

## Features
* Tasks. It's the core of Prescott. There are two main kinds of that:
    + Track task for a repository. Prescott will be monitoring the repository and running relevant scenarios for every type of event happening.
    + General task. It can be everything a machine can do. Just emphasize what you want and Prescott will take care of it. It's that simple.
* Borders. Prescott allows set limitations both for the particular task and for the server in general.
* Configuration. Use JS-like configuration language to communicate with Prescott. Be sure, it will understand what do you mean.
* Logs & History. Every piece of output of every run will be available as long as you want.
* Metrics. Prescott can measure and build statistics for resources usage of every task.
* Extending. Prescott is fully open, therefore it's easy to create your own solutions. GUI, for example.
* Authentication. Only authenticated users can interact with the application.
* Authorization. Prescott provides a system for roles creating and managing access for them.

## Technologies
* Backend: Fastify, TypeScript
* Auth: JWT
* Database: PostgreSQL, MongoDB, Redis
* CI/CD: Docker, GitHub Actions
* Other: cron, docker-compose
