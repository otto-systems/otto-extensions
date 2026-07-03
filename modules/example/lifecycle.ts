export type ModuleLifecycleContext = {
  moduleId: string;
  startedAt: string;
};

export async function onLoad(context: ModuleLifecycleContext): Promise<void> {
  void context;
}

export async function onStart(context: ModuleLifecycleContext): Promise<void> {
  void context;
}

export async function onStop(context: ModuleLifecycleContext): Promise<void> {
  void context;
}
