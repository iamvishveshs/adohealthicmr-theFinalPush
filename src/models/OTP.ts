/** OTP is handled in-memory in auth routes. */
export interface IOTP {
  email: string;
  otp: string;
  expiresAt: Date;
}
