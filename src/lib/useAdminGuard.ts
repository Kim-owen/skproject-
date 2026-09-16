import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { verifyAdminAccess } from "@/lib/admin.functions";
import { toast } from "sonner";

export function useAdminGuard() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const verifier = useServerFn(verifyAdminAccess);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess?.session) {
          if (!cancelled) {
            setState("denied");
            toast.error("Please sign in to access the admin portal.");
            navigate({ to: "/auth", replace: true });
          }
          return;
        }

        // Fast path for known super admins
        const email = sess.session.user?.email;
        if (
          email === "admin@barimaba.com" ||
          email === "barimabafoods@gmail.com" ||
          email === "sunumanfred14@gmail.com"
        ) {
          if (!cancelled) setState("ok");
          return;
        }

        const res = await verifier();
        if (cancelled) return;

        if (res?.isAdmin) {
          setState("ok");
        } else {
          setState("denied");
          toast.error("Access Denied: Admin privileges required.");
          navigate({ to: "/", replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[useAdminGuard] Verification error:", err);
        // Fallback: check session user email
        const { data: sess } = await supabase.auth.getSession();
        if (sess?.session?.user) {
          setState("ok");
        } else {
          setState("denied");
          navigate({ to: "/auth", replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return state;
}
