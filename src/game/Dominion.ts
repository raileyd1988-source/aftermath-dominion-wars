import { CommandCenter, Barracks, VehicleFactory, ResearchCenter, Hospital, AllianceHall } from './Building';
import { Resources } from '../shared/types';

export class Dominion {
  playerId: string;
  name: string;
  commandCenter: CommandCenter;
  buildings: Map<string, any>;
  resources: Resources;
  protected: boolean; // Protection status for HQ1-9

  constructor(playerId: string, dominonName: string = 'My Dominion') {
    this.playerId = playerId;
    this.name = dominonName;
    this.commandCenter = new CommandCenter(1);
    this.protected = true; // Protected until HQ10
    this.resources = {
      food: 1000,
      fuel: 1000,
      steel: 500,
      components: 100,
      nexusMaterials: 0,
    };

    // Initialize starting buildings
    this.buildings = new Map([
      ['commandCenter', this.commandCenter],
      ['barracks', new Barracks(1)],
      ['vehicleFactory', new VehicleFactory(1)],
      ['researchCenter', new ResearchCenter(1)],
      ['hospital', new Hospital(1)],
      ['allianceHall', new AllianceHall(1)],
    ]);
  }

  getCommandCenterLevel(): number {
    return this.commandCenter.level;
  }

  setCommandCenterLevel(level: number): void {
    this.commandCenter.level = Math.min(level, 30); // Max level 30
  }

  isProtected(): boolean {
    return this.protected && this.getCommandCenterLevel() < 10;
  }

  endProtection(): boolean {
    if (this.getCommandCenterLevel() >= 10) {
      this.protected = false;
      return true;
    }
    return false;
  }

  addResources(resources: Partial<Resources>): void {
    if (resources.food !== undefined) this.resources.food += resources.food;
    if (resources.fuel !== undefined) this.resources.fuel += resources.fuel;
    if (resources.steel !== undefined) this.resources.steel += resources.steel;
    if (resources.components !== undefined) this.resources.components += resources.components;
    if (resources.nexusMaterials !== undefined) this.resources.nexusMaterials += resources.nexusMaterials;
  }

  removeResources(resources: Partial<Resources>): boolean {
    // Check if player has enough resources
    if (
      (resources.food !== undefined && this.resources.food < resources.food) ||
      (resources.fuel !== undefined && this.resources.fuel < resources.fuel) ||
      (resources.steel !== undefined && this.resources.steel < resources.steel) ||
      (resources.components !== undefined && this.resources.components < resources.components) ||
      (resources.nexusMaterials !== undefined && this.resources.nexusMaterials < resources.nexusMaterials)
    ) {
      return false;
    }

    this.addResources({
      food: resources.food ? -resources.food : 0,
      fuel: resources.fuel ? -resources.fuel : 0,
      steel: resources.steel ? -resources.steel : 0,
      components: resources.components ? -resources.components : 0,
      nexusMaterials: resources.nexusMaterials ? -resources.nexusMaterials : 0,
    });

    return true;
  }

  getVisualState(): string {
    const level = this.getCommandCenterLevel();
    if (level <= 5) return 'Abandoned Checkpoint';
    if (level <= 10) return 'Survivor Camp';
    if (level <= 15) return 'Military Compound';
    if (level <= 20) return 'Fortified Settlement';
    return 'Dominion City';
  }
}
