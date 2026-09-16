import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAdminGuard() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        if (!cancelled) {
          setState("denied");
          toast.error("Please sign in to access the admin portal.");
          navigate({ to: "/auth", replace: true });
        }
        return;
      }

      if (sess.session.user?.email === "admin@barimaba.com") {
        if (!cancelled) setState("ok");
        return;
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: sess.session.user.id,
        _role: "admin",
      });
      if (cancelled) return;

      if (error || !data) {
        setState("denied");
        toast.error("Access Denied: Admin privileges required.");
        navigate({ to: "/", replace: true });
      } else {
        setState("ok");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return state;
}
