import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAdminUsers,
  updateUserRole,
  adminSetUserPassword,
  sendUserDirectSMS,
  type AdminUserListItem,
} from "@/lib/users.functions";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { formatGHS } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  KeyRound,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
  Send,
  Loader2,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/portal/users")({
  head: () => ({
    meta: [
      { title: "Admin — Users & Customers Directory | Barima Ba Foods" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const guard = useAdminGuard();
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listAdminUsers);
  const changeRole = useServerFn(updateUserRole);
  const setPassword = useServerFn(adminSetUserPassword);
  const sendSMS = useServerFn(sendUserDirectSMS);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: () => fetchUsers(),
    enabled: guard === "ok",
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // SMS Modal State
  const [smsModalUser, setSmsModalUser] = useState<AdminUserListItem | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSMS, setSendingSMS] = useState(false);

  // Password Reset Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUserListItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q));
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

  // Metrics
  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalCustomers = users.filter((u) => u.role === "customer").length;
  const totalVerified = users.filter((u) => u.is_phone_verified).length;

  const handleRoleChange = async (userId: string, newRole: "admin" | "staff" | "customer") => {
    try {
      await changeRole({ data: { target_user_id: userId, role: newRole } });
      toast.success(`User role updated to ${newRole.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsModalUser?.phone) {
      toast.error("This user does not have a phone number registered.");
      return;
    }
    if (!smsMessage.trim()) {
      toast.error("Please type a message before sending.");
      return;
    }
    setSendingSMS(true);
    try {
      await sendSMS({
        data: {
          phone: smsModalUser.phone,
          message: smsMessage,
        },
      });
      toast.success(`SMS delivered successfully to ${smsModalUser.phone}!`);
      setSmsModalUser(null);
      setSmsMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send SMS.");
    } finally {
      setSendingSMS(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    setUpdatingPassword(true);
    try {
      await setPassword({
        data: {
          target_user_id: passwordModalUser.id,
          new_password: newPassword,
        },
      });
      toast.success(`Password updated successfully for ${passwordModalUser.email}`);
      setPasswordModalUser(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update user password.");
    } finally {
      setUpdatingPassword(false);
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Users & Customers
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View registered customer accounts, manage administrator roles, reset passwords, and
              send direct SMS messages.
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <Users className="h-4 w-4 text-primary" /> Total Accounts
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <ShoppingBag className="h-4 w-4 text-emerald-500" /> Customers
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{totalCustomers}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <ShieldCheck className="h-4 w-4 text-amber-500" /> Administrators
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{totalAdmins}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-sky-500" /> Phone Verified
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{totalVerified}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone number..."
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-44 rounded-xl">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="customer">Customers Only</SelectItem>
              <SelectItem value="staff">Staff Only</SelectItem>
              <SelectItem value="admin">Admins Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Customer / User</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Orders & Spend</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      No user accounts found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const initials = (u.full_name || u.email)
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        {/* User identity */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-foreground line-clamp-1">
                                {u.full_name || "Unnamed User"}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact details */}
                        <td className="px-5 py-3.5 text-xs">
                          {u.phone ? (
                            <div className="flex items-center gap-1.5 font-mono">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{u.phone}</span>
                              {u.is_phone_verified && (
                                <span title="Phone number verified">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">
                              No phone added
                            </span>
                          )}
                          {u.delivery_address && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[200px] mt-0.5">
                              📍 {u.delivery_address}
                            </p>
                          )}
                        </td>

                        {/* Role Switcher */}
                        <td className="px-5 py-3.5">
                          <Select
                            value={u.role}
                            onValueChange={(val: "admin" | "staff" | "customer") =>
                              handleRoleChange(u.id, val)
                            }
                          >
                            <SelectTrigger
                              className={`h-7 text-xs font-bold rounded-lg w-28 ${
                                u.role === "admin"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                                  : u.role === "staff"
                                    ? "border-sky-500/30 bg-sky-500/10 text-sky-500"
                                    : "border-border bg-secondary/50 text-muted-foreground"
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="customer" className="text-xs font-semibold">
                                Customer
                              </SelectItem>
                              <SelectItem value="staff" className="text-xs font-semibold text-sky-500">
                                Staff
                              </SelectItem>
                              <SelectItem value="admin" className="text-xs font-bold text-amber-500">
                                Admin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Order Stats */}
                        <td className="px-5 py-3.5 text-xs">
                          <p className="font-bold text-foreground">
                            {u.orders_count} {u.orders_count === 1 ? "order" : "orders"}
                          </p>
                          <p className="text-[11px] text-emerald-500 font-semibold">
                            {formatGHS(u.total_spent_ghs)}
                          </p>
                        </td>

                        {/* Registered date */}
                        <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs font-semibold"
                            onClick={() => {
                              setSmsModalUser(u);
                              setSmsMessage(
                                `Hello ${u.full_name || "Customer"}, this is Barima Ba Foods. `,
                              );
                            }}
                            title="Send direct SMS"
                          >
                            <MessageSquare className="mr-1 h-3.5 w-3.5 text-primary" /> SMS
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs font-semibold"
                            onClick={() => {
                              setPasswordModalUser(u);
                              setNewPassword("");
                            }}
                            title="Set/Reset Password"
                          >
                            <KeyRound className="mr-1 h-3.5 w-3.5 text-muted-foreground" /> Password
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Direct SMS Modal */}
      <Dialog
        open={Boolean(smsModalUser)}
        onOpenChange={(open) => !open && setSmsModalUser(null)}
      >
        <DialogContent className="max-w-md rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Send SMS Notification
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Direct message to{" "}
              <strong className="text-foreground">
                {smsModalUser?.full_name || smsModalUser?.email}
              </strong>{" "}
              ({smsModalUser?.phone || "No phone"})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendSMS} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Recipient Phone</Label>
              <Input
                value={smsModalUser?.phone || ""}
                disabled
                className="rounded-xl font-mono text-xs bg-muted/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                <span>Message</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {smsMessage.length} / 160 characters (1 SMS)
                </span>
              </Label>
              <Textarea
                rows={4}
                required
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your SMS message here..."
                className="rounded-xl resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={sendingSMS}
                onClick={() => setSmsModalUser(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendingSMS || !smsModalUser?.phone}
                className="rounded-xl font-semibold"
              >
                {sendingSMS ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-4 w-4" /> Send SMS Now
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Set User Password Modal */}
      <Dialog
        open={Boolean(passwordModalUser)}
        onOpenChange={(open) => !open && setPasswordModalUser(null)}
      >
        <DialogContent className="max-w-md rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" /> Update User Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set a new secure password for{" "}
              <strong className="text-foreground">{passwordModalUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">
                New Password (Minimum 8 characters)
              </Label>
              <Input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="rounded-xl font-mono text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={updatingPassword}
                onClick={() => setPasswordModalUser(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingPassword || newPassword.length < 8}
                className="rounded-xl font-semibold"
              >
                {updatingPassword ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-1.5 h-4 w-4" /> Set Password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
