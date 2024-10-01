export interface K8sPodIdentifier {
  name: string;
  namespace: string;
  runnerContainer: string; // container that will be used to infer exit code of the task
}
