import { Agent17Provider } from './Agent17Provider';
import { Agent17MockProvider } from './Agent17MockProvider';
import { Agent17LiveProvider } from './Agent17LiveProvider';

let instance: Agent17Provider | null = null;

export function getAgent17Provider(): Agent17Provider {
  if (instance) return instance;

  const providerType = (process.env.AGENT17_PROVIDER || 'mock').toLowerCase();

  if (providerType === 'live') {
    instance = new Agent17LiveProvider();
  } else {
    instance = new Agent17MockProvider();
  }

  return instance;
}

export * from './Agent17Provider';
export * from './Agent17MockProvider';
export * from './Agent17LiveProvider';
