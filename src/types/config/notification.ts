export type NotificationConfig =
  | {
      type: "email";
      email: string;
    }
  | {
      type: "sms";
      phoneNumber: string;
    };