export interface MessageEvent {
  userId: string;
  displayName: string;
  badges: string;
  color: string;
  mod: boolean;
  firstMsg: boolean;
  subscriber: boolean;
  returningChatter: boolean;
  messageType: string;
  message: string;
}

export interface RedemptionEvent {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  user_input: string;
  status: string;
  redeemed_at: Date;
  reward: Reward;
}

export interface Reward {
  id: string;
  title: string;
  prompt: string;
  cost: number;
}

export interface AlertEvent {
  displayName: string;
  type: string;
}
