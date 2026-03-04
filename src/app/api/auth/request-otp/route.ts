import { NextRequest, NextResponse } from 'next/server';
import { setOTP } from '@/lib/pg-auth';
import { sendOTPEmail } from '@/backend/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Request OTP – stored in PostgreSQL.
 * POST /api/auth/request-otp
 * Body: { email: string, username: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, username } = await request.json();

    if (!email || !username) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and username are required',
          message: 'Please provide both your email address and username',
        },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedUsername = username.trim();

    const otpCode = await setOTP(trimmedEmail, trimmedUsername);

    // Send OTP via email
    try {
      await sendOTPEmail(trimmedEmail, otpCode);
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
    }

    console.log('\n==========================================');
    console.log('OTP for', trimmedEmail, ':', otpCode);
    console.log('Expires in: 5 minutes');
    console.log('==========================================\n');

    return NextResponse.json(
      {
        success: true,
        message: 'OTP has been sent to your email address. Please check your inbox.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Request OTP error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to request OTP',
        message: 'An error occurred while requesting OTP. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}