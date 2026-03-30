import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { getDeviceFingerprint, getDeviceName } from "@/lib/device-fingerprint";
import { Shield, Mail, RefreshCw, CheckCircle } from "lucide-react";

interface OTPVerificationProps {
  userEmail: string;
  onVerified: () => void;
  onCancel: () => void;
}

const COOLDOWN_SECONDS = 30;

const OTPVerification = ({ userEmail, onVerified, onCancel }: OTPVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const sendOTP = useCallback(async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { deliveryMethod: "email" },
      });

      if (error) throw error;

      if (data?.devCode) {
        setDevCode(data.devCode);
      }

      setOtpSent(true);
      setCooldown(COOLDOWN_SECONDS);
      toast({ title: "OTP Sent", description: `Verification code sent to ${userEmail}` });
    } catch (err: any) {
      toast({
        title: "Failed to send OTP",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [userEmail]);

  // Send OTP on mount
  useEffect(() => {
    sendOTP();
  }, [sendOTP]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast({ title: "Enter all 6 digits", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      const deviceName = getDeviceName();

      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { code: otp, deviceFingerprint: fingerprint, deviceName },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "Verified!", description: "Device trusted successfully." });
        onVerified();
      } else {
        toast({
          title: "Verification failed",
          description: data?.error || "Invalid code",
          variant: "destructive",
        });
        setOtp("");
      }
    } catch (err: any) {
      const msg = err?.message || "Verification failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Verify Your Identity
          </h1>
          <p className="text-muted-foreground mt-1">
            New device detected — enter the code to continue
          </p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Verification
            </CardTitle>
            <CardDescription>
              A 6-digit code was sent to <strong>{userEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dev mode code display */}
            {devCode && (
              <div className="rounded-lg bg-accent/10 border border-accent/30 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Dev Mode — OTP Code:</p>
                <p className="text-2xl font-mono font-bold text-accent tracking-widest">
                  {devCode}
                </p>
              </div>
            )}

            {/* OTP Input */}
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Timer & Resend */}
            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Resend available in{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {cooldown}s
                  </span>
                </p>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={sendOTP}
                  disabled={sending}
                  className="text-primary"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${sending ? "animate-spin" : ""}`} />
                  Resend Code
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={handleVerify}
                className="w-full"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  "Verifying..."
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify & Continue
                  </>
                )}
              </Button>
              <Button variant="ghost" className="w-full" onClick={onCancel}>
                Cancel
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Code expires in 5 minutes. This device will be remembered for future logins.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OTPVerification;
