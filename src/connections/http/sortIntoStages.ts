import { HttpRouteStageConfig, HttpRouteConfig } from "../../types/config/httpProxy";

export default function sortIntoStages(routeConfig: HttpRouteConfig) {
  let stages: HttpRouteStageConfig[] = (function sortIntoStages() {
    const unsortedStages = Object.keys(routeConfig.services).reduce(
      (acc, serviceName) => {
        const serviceConfig = routeConfig.services[serviceName];
        const existingStage = acc.find((x) => x.stage === serviceConfig.stage);
        if (!existingStage) {
          const newStage = {
            stage: serviceConfig.stage,
            services: {
              [serviceName]: serviceConfig,
            },
          };
          return acc.concat(newStage);
        } else {
          existingStage.services[serviceName] = serviceConfig;
          return acc;
        }
      },
      [] as HttpRouteStageConfig[]
    );

    return unsortedStages.sort(
      (x, y) => (x.stage || Infinity) - (y.stage || Infinity)
    );
  })();

  return stages;
}
