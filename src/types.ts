import { Scenes, Context } from "telegraf";

export interface WizardState {
  name?: string;
  goal?: string;
  morningTime?: string;
  eveningTime?: string;
  workedOn?: string;
  morningGoals?: string;
  achievedGoals?: boolean;
  reasonIfNo?: string | null;
  userId?: number;
}

export interface BotContext extends Context {
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext> & { state: WizardState };
  session: Scenes.WizardSession<Scenes.WizardSessionData>;
}