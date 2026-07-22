import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bell,
  Save,
  Send,
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import {
  getNotificationSettings,
  updateNotificationSettings,
  sendTestSMS,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "@/lib/settings.functions";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Admin — Notifications & SMS Settings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const guard = useAdminGuard();
  const queryClient = useQueryClient();

  const fetcher = useServerFn(getNotificationSettings);
  const updater = useServerFn(updateNotificationSettings);
  const testSmsSender = useServerFn(sendTestSMS);

  const { data: initialData, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => fetcher(),
    enabled: guard === "ok",
  });

  const [form, setForm] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello! This is a test SMS from Barima Ba Foods.");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    }
  }, [initialData]);

  const updateMutation = useMutation({
    mutationFn: (newSettings: NotificationSettings) => updater({ data: newSettings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Notification settings saved successfully!", {
        description: "SMS alert routing preferences are now updated live.",
      });
    },
    onError: (err: any) => {
      toast.error("Failed to save settings", {
        description: err.message || "An unexpected error occurred",
      });
    },
  });

  const handleFieldChange = (key: keyof NotificationSettings, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || testPhone.trim().length < 9) {
      toast.error("Please enter a valid recipient phone number for the test.");
      return;
    }
    setSendingTest(true);
    try {
      await testSmsSender({ data: { phone: testPhone, message: testMessage } });
      toast.success("Test SMS sent successfully!", {
        description: `Check the phone number ${testPhone} for your message.`,
      });
    } catch (err: any) {
      toast.error("Failed to send test SMS", {
        description: err.message || "Check your TxtConnect API keys and internet connection.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (guard !== "ok" || isLoading) {
    return (
      <AdminShell>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-10 w-10 animate-spin text-amber-500" />
            <p className="text-sm font-semibold text-muted-foreground">
              Loading settings configuration...
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            SETTINGS & ALERTS
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure TxtConnect SMS routing rules, notification alerts, and verify gateways.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* SMS Notification Control Panel */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">SMS Notifications</h2>
                <p className="text-xs text-muted-foreground">
                  Enable alerts for admins, riders, and customers.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Admin Alerts Toggle & Phone */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">New Order Alerts (Admin)</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive an SMS alert immediately when a customer orders.
                    </p>
                  </div>
                  <Switch
                    checked={form.enable_admin_alerts}
                    onCheckedChange={(checked) => handleFieldChange("enable_admin_alerts", checked)}
                  />
                </div>

                {form.enable_admin_alerts && (
                  <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-900 space-y-2">
                    <Label
                      htmlFor="admin_phone"
                      className="text-xs font-bold text-amber-500 uppercase tracking-wider"
                    >
                      Admin Recipient Phone Number
                    </Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="admin_phone"
                        type="text"
                        placeholder="e.g. 233241234567"
                        className="pl-10 rounded-xl"
                        value={form.admin_notification_phone}
                        onChange={(e) =>
                          handleFieldChange("admin_notification_phone", e.target.value)
                        }
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Enter the country code prefix without the plus sign (e.g. 233 for Ghana).
                    </p>
                  </div>
                )}
              </div>

              <hr className="border-border" />

              {/* Rider Alerts Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Rider Dispatch Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Send detailed delivery details automatically when a rider is assigned.
                  </p>
                </div>
                <Switch
                  checked={form.enable_rider_alerts}
                  onCheckedChange={(checked) => handleFieldChange("enable_rider_alerts", checked)}
                />
              </div>

              <hr className="border-border" />

              {/* Customer Alerts Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Customer Status Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Notify customers on status updates (preparing, out for delivery, etc.).
                  </p>
                </div>
                <Switch
                  checked={form.enable_customer_alerts}
                  onCheckedChange={(checked) =>
                    handleFieldChange("enable_customer_alerts", checked)
                  }
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
                className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-lg shadow-amber-500/10"
              >
                {updateMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving Settings...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Configuration
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* TxtConnect Gateway Connection Tester */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">SMS Hook Connection Tester</h2>
                <p className="text-xs text-muted-foreground">
                  Verify TxtConnect credentials and gateway routing instantly.
                </p>
              </div>
            </div>

            <form onSubmit={handleSendTest} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="test_phone"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Test Recipient Phone Number
                </Label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="test_phone"
                    type="text"
                    placeholder="e.g. 233240000000"
                    className="pl-10 rounded-xl"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="test_message"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Custom Test Message
                </Label>
                <textarea
                  id="test_message"
                  rows={3}
                  className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Type your test SMS here..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                disabled={sendingTest}
                className="w-full rounded-2xl border-amber-500/40 hover:bg-amber-500/10 text-amber-400 font-extrabold"
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin text-amber-500" /> Sending
                    SMS...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send Test SMS
                  </>
                )}
              </Button>
            </form>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold">
                <ShieldCheck className="h-4 w-4" /> Gateway Verification info
              </div>
              <p className="text-muted-foreground leading-relaxed">
                If the test fails, make sure your **`TXTCONNECT_API_KEY`** is configured correctly
                in Vercel settings and redeployed. Success response means your SMS account is
                authenticated with sender ID **`Barimafoods`**!
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
