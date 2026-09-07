import { Alliance } from './Alliance';

export interface TechResearch {
  id: string;
  name: string;
  description: string;
  branch: 'development' | 'warfare' | 'defense' | 'alliance' | 'dominion';
  level: number;
  resourceCost: { points: number };
  timeCost: number; // seconds
  bonus: { type: string; value: number };
  prerequisites?: string[];
}

export interface ResearchProgress {
  techId: string;
  alliance: Alliance;
  startedAt: Date;
  completionTime: Date;
  isComplete: boolean;
}

export class AllianceTech {
  alliance: Alliance;
  research: Map<string, ResearchProgress>;
  researchPoints: number; // Alliance Research Points - earned by members
  donationLog: Map<string, number>; // playerId -> total donated

  constructor(alliance: Alliance) {
    this.alliance = alliance;
    this.research = new Map();
    this.researchPoints = 0;
    this.donationLog = new Map();
  }

  /**
   * Member donates resources to alliance research
   */
  donateToResearch(playerId: string, amount: number): boolean {
    if (amount <= 0) return false;

    this.researchPoints += amount;

    // Track donation
    const currentDonation = this.donationLog.get(playerId) || 0;
    this.donationLog.set(playerId, currentDonation + amount);

    // Reward player with Alliance Credits and Contribution Points
    this.alliance.credits += Math.floor(amount * 0.5); // Example: 1 point = 0.5 credits
    this.alliance.updateMemberActivity(playerId, {
      donations: (this.alliance.getMemberActivityStatus(playerId)?.donations || 0) + amount,
    });

    return true;
  }

  /**
   * Start researching a tech
   */
  startResearch(techId: string, tech: TechResearch): boolean {
    if (this.research.has(techId)) return false;
    if (this.researchPoints < tech.resourceCost.points) return false;

    // Spend points
    this.researchPoints -= tech.resourceCost.points;

    // Create research progress
    const progress: ResearchProgress = {
      techId,
      alliance: this.alliance,
      startedAt: new Date(),
      completionTime: new Date(Date.now() + tech.timeCost * 1000),
      isComplete: false,
    };

    this.research.set(techId, progress);
    return true;
  }

  /**
   * Complete research
   */
  completeResearch(techId: string): boolean {
    const progress = this.research.get(techId);
    if (!progress) return false;

    progress.isComplete = true;

    // Apply bonus to tech branch
    // This would be handled by the game's progression system

    return true;
  }

  /**
   * Get research progress
   */
  getResearchProgress(techId: string): ResearchProgress | null {
    return this.research.get(techId) || null;
  }

  /**
   * Get active research
   */
  getActiveResearch(): ResearchProgress[] {
    return Array.from(this.research.values()).filter(r => !r.isComplete);
  }

  /**
   * Get member donation leaderboard
   */
  getDonationLeaderboard(): Array<{ playerId: string; donated: number }> {
    return Array.from(this.donationLog.entries())
      .map(([playerId, donated]) => ({ playerId, donated }))
      .sort((a, b) => b.donated - a.donated);
  }
}
