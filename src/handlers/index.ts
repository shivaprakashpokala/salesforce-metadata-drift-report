import type { MetadataHandler } from './types.js';
import { createGenericHandler, createPermissionHandler } from './generic.js';
import { apexClassHandler, apexTriggerHandler } from './apex.js';

const handlers = new Map<string, MetadataHandler>(
  [
    apexClassHandler,
    apexTriggerHandler,
    createPermissionHandler('Profile'),
    createPermissionHandler('PermissionSet'),
  ].map((handler) => [handler.metadataType, handler]),
);

export function getHandler(metadataType: string): MetadataHandler {
  return handlers.get(metadataType) ?? createGenericHandler(metadataType);
}
