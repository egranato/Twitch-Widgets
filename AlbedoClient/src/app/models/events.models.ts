export interface MessageEvent {
  userId: string;
  displayName: string;
  badges: any;
  color: string;
  mod: boolean;
  firstMsg: boolean;
  subscriber: boolean;
  returningChatter: boolean;
  messageType: string;
  message: string;
  messageHTML: string;
  userImage: string;
}
