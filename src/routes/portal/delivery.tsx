import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getDeliveryDashboardData,
  upsertDeliveryZone,
  deleteDeliveryZone,
  toggleDeliveryZoneActive,
  updateLogisticsSettings,
  DEFAULT_LOGISTICS_SETTINGS,
  type DeliveryZone,
  type LogisticsSettings,
} from "@/lib/delivery.functions";
import { AdminShell } from "@/components/shop/AdminShell";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { formatGHS } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  ShieldCheck,
  Zap,
  Save,
  Loader2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  X,
} from "lucide-react";

export const Route = createFileRoute("/portal/delivery")({
  head: () => ({
    meta: [
      { title: "Admin — Delivery & Logistics Hub | Barima Ba Foods" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDeliveryPage,
});

function AdminDeliveryPage() {
  const guard = useAdminGuard();
  const queryClient = useQueryClient();

  const fetchDashboard = useServerFn(getDeliveryDashboardData);
  const saveZone = useServerFn(upsertDeliveryZone);
  const delZone = useServerFn(deleteDeliveryZone);
  const toggleZone = useServerFn(toggleDeliveryZoneActive);
  const saveLogistics = useServerFn(updateLogisticsSettings);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-delivery-data"],
    queryFn: () => fetchDashboard(),
    enabled: guard === "ok",
  });

  const zones = data?.zones ?? [];
  const [logistics, setLogistics] = useState<LogisticsSettings>(DEFAULT_LOGISTICS_SETTINGS);
  const [isLogisticsDirty, setIsLogisticsDirty] = useState(false);
  const [newPartner, setNewPartner] = useState("");

  // Zone Modal State
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState<{
    id?: string;
    name: string;
    fee_ghs: number | string;
    is_active: boolean;
  }>({ name: "", fee_ghs: 25, is_active: true });
  const [savingZone, setSavingZone] = useState(false);

  // Delete modal state
  const [deleteModalZone, setDeleteModalZone] = useState<DeliveryZone | null>(null);
  const [deletingZone, setDeletingZone] = useState(false);

  const [searchZone, setSearchZone] = useState("");

  useEffect(() => {
    if (data?.settings) {
      setLogistics(data.settings);
    }
  }, [data]);

  const filteredZones = zones.filter((z) =>
    z.name.toLowerCase().includes(searchZone.toLowerCase().trim()),
  );

  const activeZonesCount = zones.filter((z) => z.is_active).length;
  const avgFee = zones.length
    ? zones.reduce((acc, z) => acc + z.fee_ghs, 0) / zones.length
    : 0;

  const handleOpenAddZone = () => {
    setZoneForm({ name: "", fee_ghs: 25, is_active: true });
    setZoneModalOpen(true);
  };

  const handleOpenEditZone = (z: DeliveryZone) => {
    setZoneForm({
      id: z.id,
      name: z.name,
      fee_ghs: z.fee_ghs,
      is_active: z.is_active,
    });
    setZoneModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.name.trim()) {
      toast.error("Please provide a zone name");
      return;
    }
    setSavingZone(true);
    try {
      await saveZone({
        data: {
          id: zoneForm.id,
          name: zoneForm.name.trim(),
          fee_ghs: Number(zoneForm.fee_ghs) || 0,
          is_active: zoneForm.is_active,
        },
      });
      toast.success(zoneForm.id ? "Delivery zone updated!" : "Delivery zone created!");
      setZoneModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-data"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save delivery zone");
    } finally {
      setSavingZone(false);
    }
  };

  const handleToggleZone = async (zone: DeliveryZone) => {
    try {
      await toggleZone({ data: { id: zone.id, is_active: !zone.is_active } });
      toast.success(`${zone.name} is now ${!zone.is_active ? "active" : "inactive"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-data"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleConfirmDeleteZone = async () => {
    if (!deleteModalZone) return;
    setDeletingZone(true);
    try {
      await delZone({ data: { id: deleteModalZone.id } });
      toast.success(`Delivery zone "${deleteModalZone.name}" deleted.`);
      setDeleteModalZone(null);
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-data"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete zone");
    } finally {
      setDeletingZone(false);
    }
  };

  const handleSaveLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveLogistics({ data: logistics });
      setIsLogisticsDirty(false);
      toast.success("Global delivery & logistics rules published successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-data"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update logistics settings");
    }
  };

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.trim()) return;
    if (logistics.dispatch_partners.includes(newPartner.trim())) {
      toast.error("This partner is already in your fleet list.");
      return;
    }
    setLogistics((p) => ({
      ...p,
      dispatch_partners: [...p.dispatch_partners, newPartner.trim()],
    }));
    setNewPartner("");
    setIsLogisticsDirty(true);
  };

  const handleRemovePartner = (name: string) => {
    setLogistics((p) => ({
      ...p,
      dispatch_partners: p.dispatch_partners.filter((item) => item !== name),
    }));
    setIsLogisticsDirty(true);
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
              Delivery & Logistics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage local delivery zones, flat rates in GHS, express dispatch fees, free shipping
              thresholds, and fleet partners.
            </p>
          </div>

          <Button
            onClick={handleOpenAddZone}
            className="rounded-xl font-semibold shadow-sm shadow-primary/10"
          >
            <Plus className="mr-1 h-4 w-4" /> Add Delivery Zone
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <MapPin className="h-4 w-4 text-primary" /> Active Zones
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {activeZonesCount} / {zones.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <Truck className="h-4 w-4 text-emerald-500" /> Avg Zone Fee
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {formatGHS(avgFee)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <Zap className="h-4 w-4 text-amber-500" /> Free Delivery Over
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {formatGHS(logistics.free_delivery_threshold_ghs)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <ShieldCheck className="h-4 w-4 text-sky-500" /> Fleet Partners
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {logistics.dispatch_partners.length}
            </p>
          </div>
        </div>

        {/* Two Columns: Zones Table (Left) and Global Delivery Settings (Right) */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Zones Table */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchZone}
                  onChange={(e) => setSearchZone(e.target.value)}
                  placeholder="Search delivery zones (e.g. Accra, Tema, East Legon)..."
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Zone Name</th>
                      <th className="px-5 py-3.5">Delivery Fee</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                          Loading delivery zones...
                        </td>
                      </tr>
                    ) : filteredZones.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                          No delivery zones configured yet. Click "Add Delivery Zone" above to create
                          one.
                        </td>
                      </tr>
                    ) : (
                      filteredZones.map((z) => (
                        <tr key={z.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span>{z.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatGHS(z.fee_ghs)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={z.is_active}
                                onCheckedChange={() => handleToggleZone(z)}
                                className="scale-90"
                              />
                              <span
                                className={`text-[11px] font-bold ${
                                  z.is_active
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {z.is_active ? "Active" : "Disabled"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-lg hover:bg-secondary"
                              onClick={() => handleOpenEditZone(z)}
                              title="Edit zone"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-lg hover:bg-destructive/10"
                              onClick={() => setDeleteModalZone(z)}
                              title="Delete zone"
                            >
                              <Trash2 className="h-4 w-4 text-destructive hover:scale-105 transition-transform" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Global Logistics & Dispatch Settings */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSaveLogistics}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" /> Logistics & Delivery Rules
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Storewide delivery thresholds, surcharge fees & courier partners.
                  </p>
                </div>
                {isLogisticsDirty && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded-full">
                    Unsaved
                  </span>
                )}
              </div>

              {/* Free Delivery Threshold */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Free Delivery Threshold (GHS)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={logistics.free_delivery_threshold_ghs}
                  onChange={(e) => {
                    setLogistics((p) => ({
                      ...p,
                      free_delivery_threshold_ghs: Number(e.target.value),
                    }));
                    setIsLogisticsDirty(true);
                  }}
                  className="rounded-xl font-mono text-sm font-bold"
                  placeholder="250"
                />
                <p className="text-[11px] text-muted-foreground">
                  Orders exceeding this amount receive automatically waived delivery fees. (Set to 0
                  to disable).
                </p>
              </div>

              {/* Express Delivery Surcharge */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Express / Priority Delivery Surcharge (GHS)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={logistics.express_delivery_fee_ghs}
                  onChange={(e) => {
                    setLogistics((p) => ({
                      ...p,
                      express_delivery_fee_ghs: Number(e.target.value),
                    }));
                    setIsLogisticsDirty(true);
                  }}
                  className="rounded-xl font-mono text-sm font-bold"
                  placeholder="20"
                />
              </div>

              {/* Estimated Delivery Time text */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Customer Delivery Time Estimate
                </Label>
                <Input
                  value={logistics.estimated_delivery_time}
                  onChange={(e) => {
                    setLogistics((p) => ({ ...p, estimated_delivery_time: e.target.value }));
                    setIsLogisticsDirty(true);
                  }}
                  className="rounded-xl text-xs"
                  placeholder="e.g. 30 - 60 minutes across Accra"
                />
              </div>

              {/* Nationwide Delivery Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border p-3 bg-muted/20">
                <div>
                  <p className="text-xs font-bold text-foreground">Nationwide Shipping Available</p>
                  <p className="text-[11px] text-muted-foreground">
                    Display express delivery outside Greater Accra region.
                  </p>
                </div>
                <Switch
                  checked={logistics.nationwide_enabled}
                  onCheckedChange={(val) => {
                    setLogistics((p) => ({ ...p, nationwide_enabled: val }));
                    setIsLogisticsDirty(true);
                  }}
                />
              </div>

              {/* Dispatch Fleet Partners */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Active Dispatch Partners & Fleets
                </Label>
                <div className="flex flex-wrap gap-2">
                  {logistics.dispatch_partners.map((partner) => (
                    <span
                      key={partner}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm"
                    >
                      {partner}
                      <button
                        type="button"
                        onClick={() => handleRemovePartner(partner)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <Input
                    value={newPartner}
                    onChange={(e) => setNewPartner(e.target.value)}
                    placeholder="Add fleet partner (e.g. Yango Delivery)..."
                    className="rounded-xl text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddPartner}
                    className="rounded-xl text-xs shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!isLogisticsDirty}
                  className="w-full rounded-xl font-semibold"
                >
                  <Save className="mr-1.5 h-4 w-4" /> Save Logistics Settings
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Add / Edit Delivery Zone Modal */}
      <Dialog open={zoneModalOpen} onOpenChange={setZoneModalOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {zoneForm.id ? "Edit Delivery Zone" : "Create Delivery Zone"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define neighborhood or regional flat rate for customer checkouts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveZone} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">
                Zone / Area Name
              </Label>
              <Input
                required
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                placeholder="e.g. East Legon, Spintex, Airport City"
                className="rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">
                Delivery Fee (GHS)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                required
                value={zoneForm.fee_ghs}
                onChange={(e) => setZoneForm({ ...zoneForm, fee_ghs: e.target.value })}
                placeholder="30"
                className="rounded-xl font-mono text-sm font-bold"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={zoneForm.is_active}
                onCheckedChange={(val) => setZoneForm({ ...zoneForm, is_active: val })}
              />
              <Label className="text-xs font-bold text-foreground cursor-pointer">
                Zone Active (Available for customer selection)
              </Label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={savingZone}
                onClick={() => setZoneModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingZone} className="rounded-xl font-semibold">
                {savingZone ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-4 w-4" /> Save Zone
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Delivery Zone Modal */}
      <Dialog
        open={Boolean(deleteModalZone)}
        onOpenChange={(open) => !open && setDeleteModalZone(null)}
      >
        <DialogContent className="max-w-md rounded-2xl border-border bg-card">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-center">
              Delete Delivery Zone?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground pt-1">
              Are you sure you want to delete the zone{" "}
              <strong className="text-foreground">{deleteModalZone?.name}</strong>?
              <span className="block mt-1 text-muted-foreground">
                Customers will no longer be able to select this specific zone during checkout.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              disabled={deletingZone}
              onClick={() => setDeleteModalZone(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingZone}
              onClick={handleConfirmDeleteZone}
              className="rounded-xl font-semibold shadow-sm"
            >
              {deletingZone ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete Zone
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
