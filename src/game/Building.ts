import { Resources } from '../shared/types';

export interface BuildingConfig {
  name: string;
  level: number;
  resourceCost: Resources;
  timeCost: number; // seconds
  requirements?: {
    minCommandCenterLevel?: number;
    prerequisiteTechs?: string[];
  };
}

export class Building {
  name: string;
  level: number;
  isUpgrading: boolean;
  upgradeStartTime: number | null;
  upgradeEndTime: number | null;

  constructor(name: string, initialLevel: number = 1) {
    this.name = name;
    this.level = initialLevel;
    this.isUpgrading = false;
    this.upgradeStartTime = null;
    this.upgradeEndTime = null;
  }

  startUpgrade(config: BuildingConfig, builderAvailable: boolean = true): boolean {
    if (this.isUpgrading) return false;
    if (!builderAvailable) return false;

    this.isUpgrading = true;
    this.upgradeStartTime = Date.now();
    this.upgradeEndTime = Date.now() + config.timeCost * 1000;
    return true;
  }

  completeUpgrade(): boolean {
    if (!this.isUpgrading) return false;

    this.isUpgrading = false;
    this.level++;
    this.upgradeStartTime = null;
    this.upgradeEndTime = null;
    return true;
  }

  getUpgradeProgress(): number {
    if (!this.isUpgrading || !this.upgradeStartTime || !this.upgradeEndTime) {
      return 0;
    }

    const elapsed = Date.now() - this.upgradeStartTime;
    const total = this.upgradeEndTime - this.upgradeStartTime;
    return Math.min(elapsed / total, 1);
  }

  cancelUpgrade(): boolean {
    if (!this.isUpgrading) return false;

    this.isUpgrading = false;
    this.upgradeStartTime = null;
    this.upgradeEndTime = null;
    return true;
  }
}

export class CommandCenter extends Building {
  constructor(initialLevel: number = 1) {
    super('Command Center', initialLevel);
  }
}

export class Barracks extends Building {
  constructor(initialLevel: number = 1) {
    super('Barracks', initialLevel);
  }
}

export class VehicleFactory extends Building {
  constructor(initialLevel: number = 1) {
    super('Vehicle Factory', initialLevel);
  }
}

export class ResearchCenter extends Building {
  constructor(initialLevel: number = 1) {
    super('Research Center', initialLevel);
  }
}

export class Hospital extends Building {
  constructor(initialLevel: number = 1) {
    super('Hospital', initialLevel);
  }

  getRecoveryCapacity(): number {
    return this.level * 100; // Example: each level recovers 100 troops
  }
}

export class AllianceHall extends Building {
  constructor(initialLevel: number = 1) {
    super('Alliance Hall', initialLevel);
  }
}
