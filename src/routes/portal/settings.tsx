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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Radio,
  Lock,
  Store,
  Clock,
  AlertTriangle,
  Loader2,
  KeyRound,
  Users,
  CheckCircle2,
} from "lucide-react";
import {
  getNotificationSettings,
  updateNotificationSettings,
  sendTestSMS,
  getStoreGeneralSettings,
  updateStoreGeneralSettings,
  broadcastNotificationToUsers,
  updateAdminSecurity,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_STORE_GENERAL_SETTINGS,
  type NotificationSettings,
  type StoreGeneralSettings,
} from "@/lib/settings.functions";

export const Route = createFileRoute("/portal/settings")({
  head: () => ({
    meta: [
      { title: "Admin — Store Settings & Security | Barima Ba Foods" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const guard = useAdminGuard();
  const queryClient = useQueryClient();

  const fetchNotificationSettings = useServerFn(getNotificationSettings);
  const saveNotificationSettings = useServerFn(updateNotificationSettings);
  const testSmsSender = useServerFn(sendTestSMS);
  const fetchGeneralSettings = useServerFn(getStoreGeneralSettings);
  const saveGeneralSettings = useServerFn(updateStoreGeneralSettings);
  const broadcastSMS = useServerFn(broadcastNotificationToUsers);
  const saveSecurity = useServerFn(updateAdminSecurity);

  // Notifications Query
  const { data: notificationData } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => fetchNotificationSettings(),
    enabled: guard === "ok",
  });

  // General Store Query
  const { data: generalData } = useQuery({
    queryKey: ["store-general-settings"],
    queryFn: () => fetchGeneralSettings(),
    enabled: guard === "ok",
  });

  const [activeTab, setActiveTab] = useState("broadcast");

  // Notifications state
  const [notifForm, setNotifForm] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello! This is a test SMS from Barima Ba Foods.");
  const [sendingTest, setSendingTest] = useState(false);

  // Store General state
  const [generalForm, setGeneralForm] = useState<StoreGeneralSettings>(
    DEFAULT_STORE_GENERAL_SETTINGS,
  );
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Broadcast state
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState<
    "all_users" | "customers_with_orders" | "phone_verified"
  >("all_users");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    total: number;
    sent: number;
    failed: number;
  } | null>(null);

  // Security state
  const [adminName, setAdminName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingSecurity, setSavingSecurity] = useState(false);

  useEffect(() => {
    if (notificationData) setNotifForm(notificationData);
  }, [notificationData]);

  useEffect(() => {
    if (generalData) setGeneralForm(generalData);
  }, [generalData]);

  // Notifications Save
  const notifMutation = useMutation({
    mutationFn: (newSettings: NotificationSettings) => saveNotificationSettings({ data: newSettings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Notification settings saved successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save notification settings");
    },
  });

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
      toast.error(err.message || "Failed to send test SMS");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      await saveGeneralSettings({ data: generalForm });
      toast.success("Store operations & hours updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["store-general-settings"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update general store settings");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) {
      toast.error("Please type a message before broadcasting.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to broadcast this SMS to your selected audience (${broadcastAudience.replace(/_/g, " ")})?`,
      )
    ) {
      return;
    }

    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await broadcastSMS({
        data: {
          message: broadcastMessage.trim(),
          audience: broadcastAudience,
        },
      });
      setBroadcastResult({
        total: res.totalRecipients,
        sent: res.sentCount,
        failed: res.failedCount,
      });
      toast.success(`Broadcast finished: ${res.sentCount} sent successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to complete broadcast");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword) {
      if (newPassword.length < 8) {
        toast.error("New password must be at least 8 characters long.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match. Please re-enter.");
        return;
      }
    }

    setSavingSecurity(true);
    try {
      await saveSecurity({
        data: {
          full_name: adminName.trim() || undefined,
          new_password: newPassword || undefined,
        },
      });
      toast.success("Admin profile & password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update admin credentials");
    } finally {
      setSavingSecurity(false);
    }
  };

  if (guard !== "ok") {
    return (
      <AdminShell>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            {guard === "loading" ? "Verifying authorization..." : "Access denied."}
          </p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Settings & Controls
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broadcast notifications to all users, manage admin credentials, configure store
            operating hours, and manage SMS alert routing.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 rounded-2xl bg-muted/50 border border-border">
            <TabsTrigger
              value="broadcast"
              className="rounded-xl py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Radio className="h-4 w-4 text-primary" /> Broadcast SMS
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-xl py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <KeyRound className="h-4 w-4 text-amber-500" /> Admin Security
            </TabsTrigger>
            <TabsTrigger
              value="general"
              className="rounded-xl py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Store className="h-4 w-4 text-emerald-500" /> Store Operations
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="rounded-xl py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Bell className="h-4 w-4 text-sky-500" /> Alerts & Routing
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Broadcast Notification to Users */}
          <TabsContent value="broadcast" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <form
                  onSubmit={handleSendBroadcast}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5"
                >
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                      <Radio className="h-5 w-5 text-primary" /> Broadcast SMS Announcement
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send a mass text alert directly to your registered customers across Ghana for
                      discounts, fresh restocks, or holiday notices.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Target Audience
                    </Label>
                    <Select
                      value={broadcastAudience}
                      onValueChange={(val: any) => setBroadcastAudience(val)}
                    >
                      <SelectTrigger className="rounded-xl font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all_users" className="text-xs font-semibold">
                          All Registered Users & Past Order Contacts (Broad Reach)
                        </SelectItem>
                        <SelectItem value="customers_with_orders" className="text-xs font-semibold">
                          Active Customers Only (Users with at least 1 order)
                        </SelectItem>
                        <SelectItem value="phone_verified" className="text-xs font-semibold">
                          Verified Phone Accounts Only
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">
                        Announcement Message
                      </Label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {broadcastMessage.length} characters (
                        {Math.ceil((broadcastMessage.length || 1) / 160)} SMS)
                      </span>
                    </div>
                    <Textarea
                      rows={5}
                      required
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="e.g. Barima Ba Foods Promo: Enjoy 10% off authentic homemade shito & provisions this weekend! Order now at https://barimabafoods.shop or reply on WhatsApp."
                      className="rounded-xl font-sans"
                    />
                  </div>

                  {broadcastResult && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400 space-y-1">
                      <p className="font-bold text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Broadcast Summary
                      </p>
                      <p className="text-xs">
                        Total queued: <strong>{broadcastResult.total}</strong> | Successfully sent:{" "}
                        <strong>{broadcastResult.sent}</strong> | Failed / Invalid numbers:{" "}
                        <strong>{broadcastResult.failed}</strong>
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={broadcasting || !broadcastMessage.trim()}
                      className="w-full sm:w-auto rounded-xl font-semibold"
                    >
                      {broadcasting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Dispatching Broadcast
                          SMS...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" /> Send Broadcast to Customers
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Sidebar Help */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                  <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-primary" /> Delivery Best Practices
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                    <li>Include your brand name <strong>Barima Ba Foods</strong> in the text.</li>
                    <li>Keep messages concise under 160 characters to optimize SMS credits.</li>
                    <li>Avoid spamming: Customers appreciate timely updates 1–2 times per month.</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Admin Security & Credentials */}
          <TabsContent value="security" className="space-y-6">
            <div className="max-w-2xl">
              <form
                onSubmit={handleSaveSecurity}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5"
              >
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <Lock className="h-5 w-5 text-amber-500" /> Update Admin Profile & Password
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Change your administrator display name or set a new password.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Admin Display Name
                  </Label>
                  <Input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Barima Ba Foods Administrator"
                    className="rounded-xl font-semibold"
                  />
                </div>

                <div className="space-y-3 pt-3 border-t border-border">
                  <h4 className="font-display text-sm font-bold text-foreground">
                    Change Account Password
                  </h4>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      New Password (Minimum 8 characters)
                    </Label>
                    <Input
                      type="password"
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep existing password"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Confirm New Password
                    </Label>
                    <Input
                      type="password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={savingSecurity}
                    className="rounded-xl font-semibold"
                  >
                    {savingSecurity ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Profile & Security
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* TAB 3: Store Operations & Hours */}
          <TabsContent value="general" className="space-y-6">
            <div className="max-w-3xl">
              <form
                onSubmit={handleSaveGeneral}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5"
              >
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <Store className="h-5 w-5 text-emerald-500" /> Store Details & Business Hours
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Public store hours, minimum checkout amounts, and emergency maintenance banner.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Store Brand Name
                    </Label>
                    <Input
                      value={generalForm.store_name}
                      onChange={(e) =>
                        setGeneralForm((p) => ({ ...p, store_name: e.target.value }))
                      }
                      className="rounded-xl font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Support Email
                    </Label>
                    <Input
                      type="email"
                      value={generalForm.support_email}
                      onChange={(e) =>
                        setGeneralForm((p) => ({ ...p, support_email: e.target.value }))
                      }
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Support Phone Number
                    </Label>
                    <Input
                      value={generalForm.support_phone}
                      onChange={(e) =>
                        setGeneralForm((p) => ({ ...p, support_phone: e.target.value }))
                      }
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      WhatsApp Orders Hotline (Digits only)
                    </Label>
                    <Input
                      value={generalForm.whatsapp_number}
                      onChange={(e) =>
                        setGeneralForm((p) => ({ ...p, whatsapp_number: e.target.value }))
                      }
                      placeholder="233241234567"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Operating Hours Display
                  </Label>
                  <Input
                    value={generalForm.operating_hours}
                    onChange={(e) =>
                      setGeneralForm((p) => ({ ...p, operating_hours: e.target.value }))
                    }
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Minimum Checkout Order (GHS)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={generalForm.minimum_order_amount}
                    onChange={(e) =>
                      setGeneralForm((p) => ({
                        ...p,
                        minimum_order_amount: Number(e.target.value),
                      }))
                    }
                    className="rounded-xl font-mono text-sm font-bold w-44"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Customers must have at least this subtotal before proceeding to payment.
                  </p>
                </div>

                {/* Maintenance Mode */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Store Maintenance Mode
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Show announcement banner pausing new checkout submissions temporarily.
                      </p>
                    </div>
                    <Switch
                      checked={generalForm.maintenance_mode}
                      onCheckedChange={(val) =>
                        setGeneralForm((p) => ({ ...p, maintenance_mode: val }))
                      }
                    />
                  </div>

                  {generalForm.maintenance_mode && (
                    <div className="space-y-1.5 pt-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Maintenance Banner Message
                      </Label>
                      <Input
                        value={generalForm.maintenance_banner_text}
                        onChange={(e) =>
                          setGeneralForm((p) => ({
                            ...p,
                            maintenance_banner_text: e.target.value,
                          }))
                        }
                        className="rounded-xl text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={savingGeneral}
                    className="rounded-xl font-semibold"
                  >
                    {savingGeneral ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Operations...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Store Operations
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* TAB 4: Alerts & SMS Routing */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    notifMutation.mutate(notifForm);
                  }}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6"
                >
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" /> Automated Order SMS Routing
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toggle automatic customer notifications and administrator order alerts.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Admin Order Alert Phone Number
                    </Label>
                    <Input
                      value={notifForm.admin_notification_phone}
                      onChange={(e) =>
                        setNotifForm((p) => ({ ...p, admin_notification_phone: e.target.value }))
                      }
                      placeholder="+233241234567"
                      className="rounded-xl font-mono text-xs font-bold"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Receives instant SMS whenever a new order is paid or submitted.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                      <div>
                        <p className="text-xs font-bold text-foreground">Admin Instant Alerts</p>
                        <p className="text-[11px] text-muted-foreground">
                          Send SMS to manager when new orders come in.
                        </p>
                      </div>
                      <Switch
                        checked={notifForm.enable_admin_alerts}
                        onCheckedChange={(val) =>
                          setNotifForm((p) => ({ ...p, enable_admin_alerts: val }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Customer Delivery Status Updates
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Send SMS to customer when order is Confirmed, Packed, or Delivered.
                        </p>
                      </div>
                      <Switch
                        checked={notifForm.enable_customer_alerts}
                        onCheckedChange={(val) =>
                          setNotifForm((p) => ({ ...p, enable_customer_alerts: val }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                      <div>
                        <p className="text-xs font-bold text-foreground">Rider Dispatch Alerts</p>
                        <p className="text-[11px] text-muted-foreground">
                          Send SMS to assigned dispatch rider with delivery details.
                        </p>
                      </div>
                      <Switch
                        checked={notifForm.enable_rider_alerts}
                        onCheckedChange={(val) =>
                          setNotifForm((p) => ({ ...p, enable_rider_alerts: val }))
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={notifMutation.isPending}
                      className="rounded-xl font-semibold"
                    >
                      {notifMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> Save Notification Settings
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Test SMS sender */}
              <div className="lg:col-span-4">
                <form
                  onSubmit={handleSendTest}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4"
                >
                  <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-primary" /> Test SMS Delivery
                  </h4>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Test Recipient Phone
                    </Label>
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="0241234567"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Message
                    </Label>
                    <Textarea
                      rows={2}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="rounded-xl text-xs resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={sendingTest}
                    className="w-full rounded-xl text-xs font-semibold"
                  >
                    {sendingTest ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending Test...
                      </>
                    ) : (
                      <>
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Send Test SMS
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
