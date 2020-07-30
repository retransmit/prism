export type Notification =
  | {
      type: "email";
      email: string;
    }
  | {
      type: "sms";
      phoneNumber: string;
    };