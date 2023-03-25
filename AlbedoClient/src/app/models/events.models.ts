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

export interface AlertEvent {
  displayName: string;
  type: string;
}
