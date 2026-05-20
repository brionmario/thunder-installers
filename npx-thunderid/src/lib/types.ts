export type DbType = 'sqlite' | 'postgres';

export interface DeployOptions {
  appName?: string;
  dbType: DbType;
  dbUrl?: string;
  thunderVersion: string;
}

export interface Recipe {
  id: string;
  displayName: string;
  description: string;
  comingSoon?: boolean;
  cliName?: string;
  installCmd?: string;
  postInstallPath?: string;
  needsAppName?: boolean;
  preflight(): Promise<void>;
  deploy(opts: DeployOptions): Promise<void>;
}
