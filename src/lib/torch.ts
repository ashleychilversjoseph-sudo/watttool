import { Capacitor, registerPlugin } from '@capacitor/core';

type TorchPlugin = {
  setEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  isAvailable(): Promise<{ available: boolean }>;
};

const Torch = registerPlugin<TorchPlugin>('Torch');

export async function setTorch(enabled: boolean): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) throw new Error('Torch is available in the Android app.');
  const availability = await Torch.isAvailable();
  if (!availability.available) throw new Error('This device does not have an available torch.');
  return (await Torch.setEnabled({ enabled })).enabled;
}
