import { createRequire } from 'node:module';

type ServiceLaunchCapabilityModule = typeof import('../../src/config/service-operation-launch-capability.js');

const capabilityRequire = createRequire(import.meta.url);
const capabilityPath = capabilityRequire.resolve('../../src/config/service-operation-launch-capability.js');

function withFreshCapabilityModule<T>(invoke: (module: ServiceLaunchCapabilityModule) => T): T {
  const originalModule = capabilityRequire.cache[capabilityPath];
  delete capabilityRequire.cache[capabilityPath];
  try {
    return invoke(capabilityRequire(capabilityPath) as ServiceLaunchCapabilityModule);
  } finally {
    if (originalModule) capabilityRequire.cache[capabilityPath] = originalModule;
    else delete capabilityRequire.cache[capabilityPath];
  }
}

export function serviceOperationLaunchCapabilityDigest(
  ...args: Parameters<ServiceLaunchCapabilityModule['serviceOperationLaunchCapabilityDigest']>
): ReturnType<ServiceLaunchCapabilityModule['serviceOperationLaunchCapabilityDigest']> {
  return withFreshCapabilityModule((module) => module.serviceOperationLaunchCapabilityDigest(...args));
}

export function serviceOperationLaunchCapabilityMatches(
  ...args: Parameters<ServiceLaunchCapabilityModule['serviceOperationLaunchCapabilityMatches']>
): ReturnType<ServiceLaunchCapabilityModule['serviceOperationLaunchCapabilityMatches']> {
  return withFreshCapabilityModule((module) => module.serviceOperationLaunchCapabilityMatches(...args));
}

export function serviceOperationLaunchClaimMatches(
  ...args: Parameters<ServiceLaunchCapabilityModule['serviceOperationLaunchClaimMatches']>
): ReturnType<ServiceLaunchCapabilityModule['serviceOperationLaunchClaimMatches']> {
  return withFreshCapabilityModule((module) => module.serviceOperationLaunchClaimMatches(...args));
}
