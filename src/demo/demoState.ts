import {LocalStoreRepository} from "../onboarding/repository";
export const DEMO_MODE=import.meta.env.VITE_DEMO_MODE!=="false";
export function resetDemoState(storage:Storage){new LocalStoreRepository(storage).deleteDemoStores();for(const key of Object.keys(storage))if(key.startsWith("easy-order-demo-"))storage.removeItem(key)}
